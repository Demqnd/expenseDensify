using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using expenseKubex.Contracts.Webhooks;
using expenseKubex.Data;
using expenseKubex.Models;
using expenseKubex.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace expenseKubex.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class WebhookController(AppDbContext dbContext, IWebhookMessageSender webhookMessageSender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetRoutine()
    {
        var routine = await dbContext.WebhookRoutines.FirstOrDefaultAsync();
        return Ok(new WebhookRoutineDto(routine?.Url ?? string.Empty, routine?.UpdatedAtUtc));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateRoutine(UpdateWebhookRoutineRequest request)
    {
        var url = request.Url?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(url) ||
            !Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { message = "A valid http or https webhook URL is required." });
        }

        TryGetUserId(out var userId);

        var routine = await dbContext.WebhookRoutines.FirstOrDefaultAsync();
        if (routine is null)
        {
            routine = new WebhookRoutine();
            dbContext.WebhookRoutines.Add(routine);
        }

        routine.Url = url;
        routine.UpdatedAtUtc = DateTime.UtcNow;
        routine.UpdatedByUserId = userId;
        await dbContext.SaveChangesAsync();

        return Ok(new WebhookRoutineDto(routine.Url, routine.UpdatedAtUtc));
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage(SendWebhookMessageRequest request)
    {
        var message = request.Message?.Trim();
        if (string.IsNullOrWhiteSpace(message))
        {
            return BadRequest(new { message = "A message is required." });
        }

        var routine = await dbContext.WebhookRoutines.FirstOrDefaultAsync();
        if (routine is null || string.IsNullOrWhiteSpace(routine.Url))
        {
            return BadRequest(new { message = "No webhook URL has been configured yet." });
        }

        try
        {
            await webhookMessageSender.SendAsync(routine.Url, message);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Failed to deliver webhook message: {ex.Message}" });
        }

        return Ok(new { message = "Message sent." });
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;

        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(subject, out userId);
    }
}
