using Dapper;
using Microsoft.Data.SqlClient;
using DocuChat.Api.Models;

namespace DocuChat.Api.Repositories;

public interface IDocumentRepository
{
    Task<Document> CreateAsync(string fileName, string contentType, string blobUri, long fileSizeBytes);
    Task<Document?> GetByIdAsync(Guid id);
    Task<List<Document>> GetAllAsync();
    Task UpdateStatusAsync(Guid id, string status, string? errorMessage = null);
    Task UpdateChunkCountAsync(Guid id, int chunkCount);
    Task AddChunksAsync(List<DocumentChunk> chunks);
    Task<List<DocumentChunk>> GetChunksByDocumentIdAsync(Guid documentId);
    Task DeleteAsync(Guid id);
}

public class DocumentRepository(SqlSettings sqlSettings) : IDocumentRepository
{
    public async Task<Document> CreateAsync(string fileName, string contentType, string blobUri, long fileSizeBytes)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO Documents (Id, FileName, ContentType, BlobUri, FileSizeBytes, Status, CreatedAt, UpdatedAt)
            VALUES (@Id, @FileName, @ContentType, @BlobUri, @FileSizeBytes, 'Pending', SYSUTCDATETIME(), SYSUTCDATETIME())
            """,
            new { Id = id, FileName = fileName, ContentType = contentType, BlobUri = blobUri, FileSizeBytes = fileSizeBytes });

        return new Document
        {
            Id = id, FileName = fileName, ContentType = contentType,
            BlobUri = blobUri, FileSizeBytes = fileSizeBytes, Status = "Pending"
        };
    }

    public async Task<Document?> GetByIdAsync(Guid id)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        return await conn.QuerySingleOrDefaultAsync<Document>(
            "SELECT * FROM Documents WHERE Id = @Id", new { Id = id });
    }

    public async Task<List<Document>> GetAllAsync()
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var results = await conn.QueryAsync<Document>(
            "SELECT * FROM Documents ORDER BY CreatedAt DESC");
        return results.ToList();
    }

    public async Task UpdateStatusAsync(Guid id, string status, string? errorMessage = null)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync(
            """
            UPDATE Documents SET Status = @Status, ErrorMessage = @ErrorMessage, UpdatedAt = SYSUTCDATETIME()
            WHERE Id = @Id
            """,
            new { Id = id, Status = status, ErrorMessage = errorMessage });
    }

    public async Task UpdateChunkCountAsync(Guid id, int chunkCount)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync(
            "UPDATE Documents SET ChunkCount = @ChunkCount, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id",
            new { Id = id, ChunkCount = chunkCount });
    }

    public async Task AddChunksAsync(List<DocumentChunk> chunks)
    {
        if (chunks.Count == 0) return;
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync(
            """
            INSERT INTO DocumentChunks (Id, DocumentId, ChunkIndex, Content, TokenCount, SearchDocumentId, CreatedAt)
            VALUES (@Id, @DocumentId, @ChunkIndex, @Content, @TokenCount, @SearchDocumentId, SYSUTCDATETIME())
            """, chunks);
    }

    public async Task<List<DocumentChunk>> GetChunksByDocumentIdAsync(Guid documentId)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        var results = await conn.QueryAsync<DocumentChunk>(
            "SELECT * FROM DocumentChunks WHERE DocumentId = @DocumentId ORDER BY ChunkIndex",
            new { DocumentId = documentId });
        return results.ToList();
    }

    public async Task DeleteAsync(Guid id)
    {
        using var conn = new SqlConnection(sqlSettings.ConnectionString);
        await conn.ExecuteAsync("DELETE FROM Documents WHERE Id = @Id", new { Id = id });
    }
}
