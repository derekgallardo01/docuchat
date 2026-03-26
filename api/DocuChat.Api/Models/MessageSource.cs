namespace DocuChat.Api.Models;

public class MessageSource
{
    public Guid Id { get; set; }
    public Guid ChatMessageId { get; set; }
    public Guid DocumentId { get; set; }
    public Guid ChunkId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double RelevanceScore { get; set; }
}
