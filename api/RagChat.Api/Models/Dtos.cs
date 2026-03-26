namespace RagChat.Api.Models;

// Chat
public record SendMessageRequest(string Message, Guid? ConversationId);

public record ChatResponseDto(
    Guid ConversationId,
    Guid MessageId,
    string Content,
    List<SourceDto> Sources);

public record SourceDto(
    string FileName,
    string Snippet,
    double RelevanceScore);

// Streaming
public record ChatStreamToken(string Token);
public record ChatStreamComplete(
    Guid ConversationId,
    Guid MessageId,
    List<SourceDto> Sources);

// Documents
public record DocumentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    int ChunkCount,
    string Status,
    DateTime CreatedAt);

// Conversations
public record ConversationListDto(
    Guid Id,
    string Title,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ConversationDetailDto(
    Guid Id,
    string Title,
    List<ChatMessageDto> Messages);

public record ChatMessageDto(
    Guid Id,
    string Role,
    string Content,
    List<SourceDto> Sources,
    DateTime CreatedAt);
