using Microsoft.AspNetCore.Mvc;
using RagChat.Api.Models;
using RagChat.Api.Repositories;
using RagChat.Api.Services;

namespace RagChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController(
    IDocumentRepository documentRepo,
    IBlobStorageService blobService,
    IDocumentProcessingService processingService,
    ISearchService searchService) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes =
    [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    ];

    [HttpGet]
    public async Task<ActionResult<List<DocumentDto>>> GetAll()
    {
        var docs = await documentRepo.GetAllAsync();
        return Ok(docs.Select(d => new DocumentDto(
            d.Id, d.FileName, d.ContentType, d.FileSizeBytes, d.ChunkCount, d.Status, d.CreatedAt)).ToList());
    }

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
    public async Task<ActionResult<DocumentDto>> Upload(IFormFile file)
    {
        if (file.Length == 0)
            return BadRequest("File is empty.");

        if (!AllowedContentTypes.Contains(file.ContentType))
            return BadRequest($"Unsupported file type: {file.ContentType}. Supported: PDF, DOCX, TXT");

        // Upload to blob storage
        using var stream = file.OpenReadStream();
        var blobUri = await blobService.UploadAsync(file.FileName, stream, file.ContentType);

        // Create document record
        var document = await documentRepo.CreateAsync(file.FileName, file.ContentType, blobUri, file.Length);

        // Process in background
        _ = Task.Run(() => processingService.ProcessDocumentAsync(document.Id));

        return Ok(new DocumentDto(
            document.Id, document.FileName, document.ContentType,
            document.FileSizeBytes, document.ChunkCount, document.Status, document.CreatedAt));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DocumentDto>> GetById(Guid id)
    {
        var doc = await documentRepo.GetByIdAsync(id);
        if (doc is null) return NotFound();

        return Ok(new DocumentDto(doc.Id, doc.FileName, doc.ContentType,
            doc.FileSizeBytes, doc.ChunkCount, doc.Status, doc.CreatedAt));
    }

    [HttpGet("{id:guid}/chunks")]
    public async Task<ActionResult<List<DocumentChunk>>> GetChunks(Guid id)
    {
        var doc = await documentRepo.GetByIdAsync(id);
        if (doc is null) return NotFound();

        var chunks = await documentRepo.GetChunksByDocumentIdAsync(id);
        return Ok(chunks);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var doc = await documentRepo.GetByIdAsync(id);
        if (doc is null) return NotFound();

        // Delete from search index, blob, and database
        await searchService.DeleteDocumentChunksAsync(id);
        await blobService.DeleteAsync(doc.BlobUri);
        await documentRepo.DeleteAsync(id);

        return NoContent();
    }
}
