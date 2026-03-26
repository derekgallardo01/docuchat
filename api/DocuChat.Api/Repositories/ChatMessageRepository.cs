using Dapper;
using Microsoft.Data.SqlClient;
using DocuChat.Api.Models;

namespace DocuChat.Api.Repositories;

public interface IChatMessageRepository
{
    Task<ChatMessage> CreateAsync(Guid conversationId, string role, string content, int? tokensUsed = null);
    Task AddSourcesAsync(Guid messageId, List<MessageSource> sources);
}

public class ChatMessageRepository(SqlSettings sqlSettings) : IChatMessageRepository
{
    public async Task<ChatMessage> CreateAsync(Guid conversationId, string role, string content, int? tokensUsed = null)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO ChatMessages (Id, ConversationId, Role, Content, TokensUsed, CreatedAt)
            VALUES (@Id, @ConversationId, @Role, @Content, @TokensUsed, SYSUTCDATETIME());

            UPDATE Conversations SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @ConversationId;
            """,
            new { Id = id, ConversationId = conversationId, Role = role, Content = content, TokensUsed = tokensUsed });

        return new ChatMessage
        {
            Id = id,
            ConversationId = conversationId,
            Role = role,
            Content = content,
            TokensUsed = tokensUsed,
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task AddSourcesAsync(Guid messageId, List<MessageSource> sources)
    {
        if (sources.Count == 0) return;

        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync(
            """
            INSERT INTO MessageSources (Id, ChatMessageId, DocumentId, ChunkId, FileName, Content, RelevanceScore)
            VALUES (@Id, @ChatMessageId, @DocumentId, @ChunkId, @FileName, @Content, @RelevanceScore)
            """,
            sources.Select(s => new
            {
                Id = Guid.NewGuid(),
                ChatMessageId = messageId,
                s.DocumentId,
                s.ChunkId,
                s.FileName,
                s.Content,
                s.RelevanceScore
            }));
    }
}
