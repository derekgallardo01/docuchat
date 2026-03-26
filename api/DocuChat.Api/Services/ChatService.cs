using DocuChat.Api.Models;
using DocuChat.Api.Repositories;

namespace DocuChat.Api.Services;

public interface IChatService
{
    Task<Guid> EnsureConversationAsync(Guid? conversationId, string firstMessage);
    IAsyncEnumerable<string> StreamResponseAsync(Guid conversationId, string userMessage, CancellationToken ct = default);
    Task<(ChatMessage Message, List<MessageSource> Sources)> FinalizeResponseAsync(
        Guid conversationId, string fullResponse, List<SearchResult> sources, int? tokensUsed = null, CancellationToken ct = default);
    Task<List<SearchResult>> RetrieveContextAsync(string query, CancellationToken ct = default);
}

public class ChatService(
    IConversationRepository conversationRepo,
    IChatMessageRepository messageRepo,
    IOpenAIService openAIService,
    ISearchService searchService) : IChatService
{
    private const string SystemPrompt =
        """
        You are a helpful AI assistant that answers questions based on the provided context from uploaded documents.
        When answering, cite the relevant sources. If the context doesn't contain enough information to answer,
        say so clearly rather than making up information. Format your responses in markdown when appropriate.

        Context from documents:
        {context}
        """;

    public async Task<Guid> EnsureConversationAsync(Guid? conversationId, string firstMessage)
    {
        if (conversationId.HasValue)
        {
            var existing = await conversationRepo.GetByIdAsync(conversationId.Value);
            if (existing is not null) return existing.Id;
        }

        var title = firstMessage.Length > 80 ? firstMessage[..80] + "..." : firstMessage;
        var conversation = await conversationRepo.CreateAsync(title);
        return conversation.Id;
    }

    public async Task<List<SearchResult>> RetrieveContextAsync(string query, CancellationToken ct = default)
    {
        var embedding = await openAIService.GetEmbeddingAsync(query, ct);
        return await searchService.SearchAsync(query, embedding, topK: 5, ct);
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(
        Guid conversationId,
        string userMessage,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        // Get conversation history
        var conversation = await conversationRepo.GetByIdAsync(conversationId);
        var history = conversation?.Messages ?? [];

        // Retrieve relevant chunks
        var searchResults = await RetrieveContextAsync(userMessage, ct);

        // Build context string
        var context = searchResults.Count > 0
            ? string.Join("\n\n---\n\n", searchResults.Select(r => $"[Source: {r.FileName}]\n{r.Content}"))
            : "No relevant documents found.";

        var prompt = SystemPrompt.Replace("{context}", context);

        // Add the current user message to history
        history.Add(new ChatMessage { Role = "user", Content = userMessage });

        // Stream the response
        await foreach (var token in openAIService.StreamChatAsync(history, prompt, ct))
        {
            yield return token;
        }
    }

    public async Task<(ChatMessage Message, List<MessageSource> Sources)> FinalizeResponseAsync(
        Guid conversationId, string fullResponse, List<SearchResult> sources, int? tokensUsed = null, CancellationToken ct = default)
    {
        // Save assistant message with token count
        var message = await messageRepo.CreateAsync(conversationId, "assistant", fullResponse, tokensUsed);

        // Save sources — keep full content for expandable citations
        var messageSources = sources.Select(s => new MessageSource
        {
            DocumentId = s.DocumentId,
            ChunkId = s.ChunkId,
            FileName = s.FileName,
            Content = s.Content,
            RelevanceScore = s.Score
        }).ToList();

        await messageRepo.AddSourcesAsync(message.Id, messageSources);

        return (message, messageSources);
    }
}
