using System.ClientModel;
using OpenAI;
using OpenAI.Chat;
using OpenAI.Embeddings;
using RagChat.Api.Models;

namespace RagChat.Api.Services;

public interface IOpenAIService
{
    IAsyncEnumerable<string> StreamChatAsync(List<Models.ChatMessage> history, string systemPrompt, CancellationToken ct = default);
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);
    Task<List<float[]>> GetEmbeddingsAsync(List<string> texts, CancellationToken ct = default);
}

public class OpenAIService(OpenAISettings settings) : IOpenAIService
{
    private readonly ChatClient _chatClient = new OpenAIClient(settings.ApiKey).GetChatClient(settings.ChatModel);
    private readonly EmbeddingClient _embeddingClient = new OpenAIClient(settings.ApiKey).GetEmbeddingClient(settings.EmbeddingModel);

    public async IAsyncEnumerable<string> StreamChatAsync(
        List<Models.ChatMessage> history,
        string systemPrompt,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var messages = new List<OpenAI.Chat.ChatMessage>
        {
            new SystemChatMessage(systemPrompt)
        };

        foreach (var msg in history)
        {
            if (msg.Role == "user")
                messages.Add(new UserChatMessage(msg.Content));
            else
                messages.Add(new AssistantChatMessage(msg.Content));
        }

        AsyncCollectionResult<StreamingChatCompletionUpdate> stream =
            _chatClient.CompleteChatStreamingAsync(messages, cancellationToken: ct);

        await foreach (var update in stream.WithCancellation(ct))
        {
            foreach (var part in update.ContentUpdate)
            {
                if (!string.IsNullOrEmpty(part.Text))
                    yield return part.Text;
            }
        }
    }

    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        OpenAIEmbedding embedding = await _embeddingClient.GenerateEmbeddingAsync(text, cancellationToken: ct);
        return embedding.ToFloats().ToArray();
    }

    public async Task<List<float[]>> GetEmbeddingsAsync(List<string> texts, CancellationToken ct = default)
    {
        OpenAIEmbeddingCollection embeddings = await _embeddingClient.GenerateEmbeddingsAsync(texts, cancellationToken: ct);
        return embeddings.Select(e => e.ToFloats().ToArray()).ToList();
    }
}
