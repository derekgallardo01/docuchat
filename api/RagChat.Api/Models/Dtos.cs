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
public record ChatStreamStatus(string Status);
public record ChatStreamComplete(
    Guid ConversationId,
    Guid MessageId,
    List<SourceDto> Sources,
    int TokensUsed);

// Documents
public record DocumentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    int ChunkCount,
    string Status,
    DateTime CreatedAt);

public record DocumentStatusUpdate(
    Guid DocumentId,
    string Status,
    string Detail,
    int? Progress = null,
    int? Total = null);

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
    int? TokensUsed,
    DateTime CreatedAt);

public record RenameConversationRequest(string Title);

// Analytics
public record AnalyticsDto(
    int TotalConversations,
    int TotalMessages,
    int TotalDocuments,
    int TotalTokensUsed,
    List<DailyStatDto> MessagesPerDay,
    List<DailyStatDto> TokensPerDay,
    List<DocumentStatusCountDto> DocumentsByStatus,
    List<TopDocumentDto> TopDocuments);

public record DailyStatDto(string Date, int Count);
public record DocumentStatusCountDto(string Status, int Count);
public record TopDocumentDto(string FileName, int ReferenceCount, double AvgRelevanceScore);
