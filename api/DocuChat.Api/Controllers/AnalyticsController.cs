using Microsoft.AspNetCore.Mvc;
using DocuChat.Api.Models;
using DocuChat.Api.Repositories;

namespace DocuChat.Api.Controllers;

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
