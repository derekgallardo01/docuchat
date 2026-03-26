namespace RagChat.Api.Models;

public class ChatMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int? TokensUsed { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<MessageSource> Sources { get; set; } = [];
}
