namespace RagChat.Api.Models;

public class DocumentChunk
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int ChunkIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public int TokenCount { get; set; }
    public string SearchDocumentId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
