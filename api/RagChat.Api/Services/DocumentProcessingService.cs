using DocumentFormat.OpenXml.Packaging;
using UglyToad.PdfPig;
using RagChat.Api.Models;
using RagChat.Api.Repositories;

namespace RagChat.Api.Services;

public interface IDocumentProcessingService
{
    Task ProcessDocumentAsync(Guid documentId, CancellationToken ct = default);
}

public class DocumentProcessingService(
    IDocumentRepository documentRepo,
    IBlobStorageService blobService,
    IOpenAIService openAIService,
    ISearchService searchService,
    ILogger<DocumentProcessingService> logger) : IDocumentProcessingService
{
    private const int MaxChunkTokens = 500;
    private const int ChunkOverlapTokens = 50;

    public async Task ProcessDocumentAsync(Guid documentId, CancellationToken ct = default)
    {
        var document = await documentRepo.GetByIdAsync(documentId);
        if (document is null) return;

        try
        {
            await documentRepo.UpdateStatusAsync(documentId, "Processing");

            // 1. Download from blob
            using var stream = await blobService.DownloadAsync(document.BlobUri, ct);
            using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream, ct);
            memoryStream.Position = 0;

            // 2. Extract text
            var text = document.ContentType switch
            {
                "application/pdf" => ExtractPdfText(memoryStream),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => ExtractDocxText(memoryStream),
                "text/plain" => await new StreamReader(memoryStream).ReadToEndAsync(ct),
                _ => throw new NotSupportedException($"Unsupported content type: {document.ContentType}")
            };

            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("No text could be extracted from the document.");

            // 3. Chunk the text
            var textChunks = ChunkText(text);

            // 4. Generate embeddings
            var embeddings = await openAIService.GetEmbeddingsAsync(textChunks, ct);

            // 5. Create chunk records and index in search
            var chunks = new List<DocumentChunk>();
            var searchDocs = new List<SearchChunkDocument>();

            for (int i = 0; i < textChunks.Count; i++)
            {
                var chunkId = Guid.NewGuid();
                var searchDocId = $"{documentId}_{i}";

                chunks.Add(new DocumentChunk
                {
                    Id = chunkId,
                    DocumentId = documentId,
                    ChunkIndex = i,
                    Content = textChunks[i],
                    TokenCount = EstimateTokens(textChunks[i]),
                    SearchDocumentId = searchDocId
                });

                searchDocs.Add(new SearchChunkDocument
                {
                    Id = searchDocId,
                    DocumentId = documentId,
                    ChunkId = chunkId,
                    FileName = document.FileName,
                    Content = textChunks[i],
                    ChunkIndex = i,
                    Embedding = embeddings[i]
                });
            }

            // 6. Save to DB and index
            await documentRepo.AddChunksAsync(chunks);
            await searchService.IndexChunksAsync(searchDocs, ct);
            await documentRepo.UpdateChunkCountAsync(documentId, chunks.Count);
            await documentRepo.UpdateStatusAsync(documentId, "Ready");

            logger.LogInformation("Processed document {DocumentId}: {ChunkCount} chunks", documentId, chunks.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process document {DocumentId}", documentId);
            await documentRepo.UpdateStatusAsync(documentId, "Failed", ex.Message);
        }
    }

    private static string ExtractPdfText(Stream stream)
    {
        using var pdf = PdfDocument.Open(stream);
        return string.Join("\n\n", pdf.GetPages().Select(p => p.Text));
    }

    private static string ExtractDocxText(Stream stream)
    {
        using var doc = WordprocessingDocument.Open(stream, false);
        return doc.MainDocumentPart?.Document?.Body?.InnerText ?? string.Empty;
    }

    private static List<string> ChunkText(string text)
    {
        var words = text.Split([' ', '\n', '\r', '\t'], StringSplitOptions.RemoveEmptyEntries);
        var chunks = new List<string>();
        var chunkSize = (int)(MaxChunkTokens * 0.75); // rough word-to-token ratio
        var overlap = (int)(ChunkOverlapTokens * 0.75);

        for (int i = 0; i < words.Length; i += chunkSize - overlap)
        {
            var chunk = string.Join(' ', words.Skip(i).Take(chunkSize));
            if (!string.IsNullOrWhiteSpace(chunk))
                chunks.Add(chunk);
        }

        return chunks;
    }

    private static int EstimateTokens(string text) => (int)(text.Split(' ').Length / 0.75);
}
