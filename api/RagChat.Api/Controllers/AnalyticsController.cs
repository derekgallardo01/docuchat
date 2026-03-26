using Microsoft.AspNetCore.Mvc;
using RagChat.Api.Models;
using RagChat.Api.Repositories;

namespace RagChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AnalyticsController(IAnalyticsRepository analyticsRepo) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AnalyticsDto>> Get()
    {
        var analytics = await analyticsRepo.GetAnalyticsAsync();
        return Ok(analytics);
    }
}
