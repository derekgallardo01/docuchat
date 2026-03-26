using Azure;
using Azure.Search.Documents;
using Azure.Search.Documents.Indexes;
using Azure.Search.Documents.Indexes.Models;
using Azure.Search.Documents.Models;
using RagChat.Api.Models;

namespace RagChat.Api.Services;

public interface ISearchService
{
    Task EnsureIndexAsync(CancellationToken ct = default);
    Task IndexChunksAsync(List<SearchChunkDocument> chunks, CancellationToken ct = default);
    Task<List<SearchResult>> SearchAsync(string queryText, float[] queryEmbedding, int topK = 5, CancellationToken ct = default);
    Task DeleteDocumentChunksAsync(Guid documentId, CancellationToken ct = default);
}

public class SearchChunkDocument
{
    public string Id { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public Guid ChunkId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int ChunkIndex { get; set; }
    public float[] Embedding { get; set; } = [];
}

public class SearchResult
{
    public Guid DocumentId { get; set; }
    public Guid ChunkId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double Score { get; set; }
}

public class SearchService : ISearchService
{
    private readonly SearchClient _searchClient;
    private readonly SearchIndexClient _indexClient;
    private readonly string _indexName;

    public SearchService(AzureSearchSettings settings)
    {
        var credential = new AzureKeyCredential(settings.ApiKey);
        var endpoint = new Uri(settings.Endpoint);
        _indexName = settings.IndexName;
        _searchClient = new SearchClient(endpoint, _indexName, credential);
        _indexClient = new SearchIndexClient(endpoint, credential);
    }

    public async Task EnsureIndexAsync(CancellationToken ct = default)
    {
        var index = new SearchIndex(_indexName)
        {
            Fields =
            [
                new SimpleField("id", SearchFieldDataType.String) { IsKey = true, IsFilterable = true },
                new SimpleField("documentId", SearchFieldDataType.String) { IsFilterable = true },
                new SimpleField("chunkId", SearchFieldDataType.String) { IsFilterable = true },
                new SearchableField("fileName") { IsFilterable = true },
                new SearchableField("content"),
                new SimpleField("chunkIndex", SearchFieldDataType.Int32) { IsSortable = true },
                new VectorSearchField("embedding", 1536, "vector-profile")
            ],
            VectorSearch = new VectorSearch
            {
                Profiles = { new VectorSearchProfile("vector-profile", "vector-algorithm") },
                Algorithms = { new HnswAlgorithmConfiguration("vector-algorithm") }
            }
        };

        await _indexClient.CreateOrUpdateIndexAsync(index, cancellationToken: ct);
    }

    public async Task IndexChunksAsync(List<SearchChunkDocument> chunks, CancellationToken ct = default)
    {
        var batch = IndexDocumentsBatch.Upload(chunks.Select(c => new
        {
            id = c.Id,
            documentId = c.DocumentId.ToString(),
            chunkId = c.ChunkId.ToString(),
            fileName = c.FileName,
            content = c.Content,
            chunkIndex = c.ChunkIndex,
            embedding = c.Embedding
        }));

        await _searchClient.IndexDocumentsAsync(batch, cancellationToken: ct);
    }

    public async Task<List<SearchResult>> SearchAsync(string queryText, float[] queryEmbedding, int topK = 5, CancellationToken ct = default)
    {
        var searchOptions = new SearchOptions
        {
            VectorSearch = new VectorSearchOptions
            {
                Queries =
                {
                    new VectorizedQuery(queryEmbedding) { KNearestNeighborsCount = topK, Fields = { "embedding" } }
                }
            },
            Size = topK,
            Select = { "documentId", "chunkId", "fileName", "content" }
        };

        // Hybrid search: combine vector similarity with BM25 keyword matching via RRF
        var response = await _searchClient.SearchAsync<Azure.Search.Documents.Models.SearchDocument>(queryText, searchOptions, ct);
        var results = new List<SearchResult>();

        await foreach (var result in response.Value.GetResultsAsync())
        {
            results.Add(new SearchResult
            {
                DocumentId = Guid.Parse(result.Document["documentId"].ToString()!),
                ChunkId = Guid.Parse(result.Document["chunkId"].ToString()!),
                FileName = result.Document["fileName"].ToString()!,
                Content = result.Document["content"].ToString()!,
                Score = result.Score ?? 0
            });
        }

        return results;
    }

    public async Task DeleteDocumentChunksAsync(Guid documentId, CancellationToken ct = default)
    {
        var searchOptions = new SearchOptions
        {
            Filter = $"documentId eq '{documentId}'",
            Select = { "id" },
            Size = 1000
        };

        var response = await _searchClient.SearchAsync<Azure.Search.Documents.Models.SearchDocument>(null, searchOptions, ct);
        var ids = new List<string>();

        await foreach (var result in response.Value.GetResultsAsync())
            ids.Add(result.Document["id"].ToString()!);

        if (ids.Count > 0)
        {
            var batch = IndexDocumentsBatch.Delete("id", ids);
            await _searchClient.IndexDocumentsAsync(batch, cancellationToken: ct);
        }
    }
}
