using Microsoft.AspNetCore.Mvc;
using RagChat.Api.Models;
using RagChat.Api.Repositories;

namespace RagChat.Api.Controllers;

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
                m.CreatedAt)).ToList()));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await conversationRepo.DeleteAsync(id);
        return NoContent();
    }
}
