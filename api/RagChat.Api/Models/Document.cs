namespace RagChat.Api.Models;

public class Document
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string BlobUri { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int ChunkCount { get; set; }
    public string Status { get; set; } = "Pending";
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
