using System.Text;
using Microsoft.AspNetCore.Mvc;
using DocuChat.Api.Models;
using DocuChat.Api.Repositories;

namespace DocuChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConversationsController(IConversationRepository conversationRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ConversationListDto>>> GetAll()
    {
        var conversations = await conversationRepo.GetAllAsync();
        return Ok(conversations);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConversationDetailDto>> GetById(Guid id)
    {
        var conversation = await conversationRepo.GetByIdAsync(id);
        if (conversation is null) return NotFound();

        return Ok(new ConversationDetailDto(
            conversation.Id,
            conversation.Title,
            conversation.Messages.Select(m => new ChatMessageDto(
                m.Id, m.Role, m.Content,
                m.Sources.Select(s => new SourceDto(s.FileName, s.Content, s.RelevanceScore)).ToList(),
                m.TokensUsed,
                m.CreatedAt)).ToList()));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Rename(Guid id, [FromBody] RenameConversationRequest request)
    {
        var conversation = await conversationRepo.GetByIdAsync(id);
        if (conversation is null) return NotFound();

        await conversationRepo.UpdateTitleAsync(id, request.Title);
        return NoContent();
    }

    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> Export(Guid id)
    {
        var conversation = await conversationRepo.GetByIdAsync(id);
        if (conversation is null) return NotFound();

        var sb = new StringBuilder();
        sb.AppendLine($"# {conversation.Title}");
        sb.AppendLine();

        foreach (var msg in conversation.Messages)
        {
            var role = msg.Role == "user" ? "**You**" : "**Assistant**";
            sb.AppendLine($"### {role}");
            sb.AppendLine();
            sb.AppendLine(msg.Content);
            sb.AppendLine();

            if (msg.Sources.Count > 0)
            {
                sb.AppendLine("*Sources:*");
                foreach (var source in msg.Sources)
                    sb.AppendLine($"- {source.FileName} ({source.RelevanceScore:P0})");
                sb.AppendLine();
            }
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/markdown", $"{conversation.Title}.md");
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await conversationRepo.DeleteAsync(id);
        return NoContent();
    }
}
