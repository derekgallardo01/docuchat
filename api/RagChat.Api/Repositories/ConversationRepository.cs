using Dapper;
using Microsoft.Data.SqlClient;
using RagChat.Api.Models;

namespace RagChat.Api.Repositories;

public interface IConversationRepository
{
    Task<Conversation> CreateAsync(string title);
    Task<Conversation?> GetByIdAsync(Guid id);
    Task<List<ConversationListDto>> GetAllAsync();
    Task UpdateTitleAsync(Guid id, string title);
    Task DeleteAsync(Guid id);
}

public class ConversationRepository(SqlSettings sqlSettings) : IConversationRepository
{
    public async Task<Conversation> CreateAsync(string title)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO Conversations (Id, Title, CreatedAt, UpdatedAt)
            VALUES (@Id, @Title, SYSUTCDATETIME(), SYSUTCDATETIME())
            """, new { Id = id, Title = title });

        return new Conversation { Id = id, Title = title, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
    }

    public async Task<Conversation?> GetByIdAsync(Guid id)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);

        var conversation = await conn.QuerySingleOrDefaultAsync<Conversation>(
            "SELECT Id, Title, CreatedAt, UpdatedAt FROM Conversations WHERE Id = @Id", new { Id = id });

        if (conversation is null) return null;

        var messages = (await conn.QueryAsync<ChatMessage>(
            """
            SELECT Id, ConversationId, Role, Content, TokensUsed, CreatedAt
            FROM ChatMessages WHERE ConversationId = @Id ORDER BY CreatedAt
            """, new { Id = id })).ToList();

        var messageIds = messages.Select(m => m.Id).ToList();
        if (messageIds.Count > 0)
        {
            var sources = (await conn.QueryAsync<MessageSource>(
                """
                SELECT Id, ChatMessageId, DocumentId, ChunkId, FileName, Content, RelevanceScore
                FROM MessageSources WHERE ChatMessageId IN @Ids
                """, new { Ids = messageIds })).ToList();

            foreach (var msg in messages)
                msg.Sources = sources.Where(s => s.ChatMessageId == msg.Id).ToList();
        }

        conversation.Messages = messages;
        return conversation;
    }

    public async Task<List<ConversationListDto>> GetAllAsync()
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var results = await conn.QueryAsync<ConversationListDto>(
            "SELECT Id, Title, CreatedAt, UpdatedAt FROM Conversations ORDER BY UpdatedAt DESC");
        return results.ToList();
    }

    public async Task UpdateTitleAsync(Guid id, string title)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync(
            "UPDATE Conversations SET Title = @Title, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id",
            new { Id = id, Title = title });
    }

    public async Task DeleteAsync(Guid id)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync("DELETE FROM Conversations WHERE Id = @Id", new { Id = id });
    }
}
