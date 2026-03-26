using Microsoft.AspNetCore.SignalR;
using DocuChat.Api.Models;
using DocuChat.Api.Repositories;
using DocuChat.Api.Services;

namespace DocuChat.Api.Hubs;

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
            await Clients.Caller.SendAsync("ReceiveStatus", new ChatStreamStatus("Creating conversation..."));
            var conversationId = await chatService.EnsureConversationAsync(request.ConversationId, request.Message);

            // Save user message
            await messageRepo.CreateAsync(conversationId, "user", request.Message);

            // Retrieve context
            await Clients.Caller.SendAsync("ReceiveStatus", new ChatStreamStatus("Searching documents..."));
            var sources = await chatService.RetrieveContextAsync(request.Message);

            // Stream response tokens
            await Clients.Caller.SendAsync("ReceiveStatus", new ChatStreamStatus("Generating response..."));
            var fullResponse = new System.Text.StringBuilder();
            var tokenCount = 0;

            await foreach (var token in chatService.StreamResponseAsync(conversationId, request.Message))
            {
                fullResponse.Append(token);
                tokenCount++;
                await Clients.Caller.SendAsync("ReceiveToken", new ChatStreamToken(token));
            }

            // Finalize and save
            var (message, messageSources) = await chatService.FinalizeResponseAsync(
                conversationId, fullResponse.ToString(), sources, tokenCount);

            await Clients.Caller.SendAsync("ReceiveComplete", new ChatStreamComplete(
                conversationId,
                message.Id,
                messageSources.Select(s => new SourceDto(s.FileName, s.Content, s.RelevanceScore)).ToList(),
                tokenCount));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing chat message");
            await Clients.Caller.SendAsync("ReceiveError", ex.Message);
        }
    }
}
