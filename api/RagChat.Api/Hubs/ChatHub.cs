using Microsoft.AspNetCore.SignalR;
using RagChat.Api.Models;
using RagChat.Api.Repositories;
using RagChat.Api.Services;

namespace RagChat.Api.Hubs;

public class ChatHub(
    IChatService chatService,
    IChatMessageRepository messageRepo,
    ILogger<ChatHub> logger) : Hub
{
    public async Task SendMessage(SendMessageRequest request)
    {
        try
        {
            // Ensure conversation exists
            var conversationId = await chatService.EnsureConversationAsync(request.ConversationId, request.Message);

            // Save user message
            await messageRepo.CreateAsync(conversationId, "user", request.Message);

            // Retrieve context for sources
            var sources = await chatService.RetrieveContextAsync(request.Message);

            // Stream response tokens
            var fullResponse = new System.Text.StringBuilder();

            await foreach (var token in chatService.StreamResponseAsync(conversationId, request.Message))
            {
                fullResponse.Append(token);
                await Clients.Caller.SendAsync("ReceiveToken", new ChatStreamToken(token));
            }

            // Finalize and save
            var (message, messageSources) = await chatService.FinalizeResponseAsync(
                conversationId, fullResponse.ToString(), sources);

            await Clients.Caller.SendAsync("ReceiveComplete", new ChatStreamComplete(
                conversationId,
                message.Id,
                messageSources.Select(s => new SourceDto(s.FileName, s.Content, s.RelevanceScore)).ToList()));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing chat message");
            await Clients.Caller.SendAsync("ReceiveError", ex.Message);
        }
    }
}
