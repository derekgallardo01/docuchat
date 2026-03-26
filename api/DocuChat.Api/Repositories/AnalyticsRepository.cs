using Dapper;
using Microsoft.Data.SqlClient;
using DocuChat.Api.Models;

namespace DocuChat.Api.Repositories;

public interface IAnalyticsRepository
{
    Task<AnalyticsDto> GetAnalyticsAsync();
}

public class AnalyticsRepository(SqlSettings sqlSettings) : IAnalyticsRepository
{
    public async Task<AnalyticsDto> GetAnalyticsAsync()
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);

        var totalConversations = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Conversations");
        var totalMessages = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM ChatMessages");
        var totalDocuments = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Documents");
        var totalTokens = await conn.ExecuteScalarAsync<int>("SELECT ISNULL(SUM(TokensUsed), 0) FROM ChatMessages");

        var messagesPerDay = (await conn.QueryAsync<DailyStatDto>(
            """
            SELECT FORMAT(CreatedAt, 'yyyy-MM-dd') as Date, COUNT(*) as Count
            FROM ChatMessages
            WHERE CreatedAt >= DATEADD(day, -30, SYSUTCDATETIME())
            GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
            ORDER BY Date
            """)).ToList();

        var tokensPerDay = (await conn.QueryAsync<DailyStatDto>(
            """
            SELECT FORMAT(CreatedAt, 'yyyy-MM-dd') as Date, ISNULL(SUM(TokensUsed), 0) as Count
            FROM ChatMessages
            WHERE CreatedAt >= DATEADD(day, -30, SYSUTCDATETIME()) AND TokensUsed IS NOT NULL
            GROUP BY FORMAT(CreatedAt, 'yyyy-MM-dd')
            ORDER BY Date
            """)).ToList();

        var documentsByStatus = (await conn.QueryAsync<DocumentStatusCountDto>(
            "SELECT Status, COUNT(*) as Count FROM Documents GROUP BY Status")).ToList();

        var topDocuments = (await conn.QueryAsync<TopDocumentDto>(
            """
            SELECT TOP 10 d.FileName, COUNT(ms.Id) as ReferenceCount, AVG(ms.RelevanceScore) as AvgRelevanceScore
            FROM MessageSources ms
            JOIN Documents d ON ms.DocumentId = d.Id
            GROUP BY d.FileName
            ORDER BY ReferenceCount DESC
            """)).ToList();

        return new AnalyticsDto(
            totalConversations, totalMessages, totalDocuments, totalTokens,
            messagesPerDay, tokensPerDay, documentsByStatus, topDocuments);
    }
}
