using System.Security.Claims;
using BrainMemo.Notification.Api.Requests;
using BrainMemo.Notification.Application.Commands.CreateAnnouncement;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Notification.Api.Controllers;

[ApiController]
[Route("api/v1/admin/announcements")]
public sealed class AdminAnnouncementsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Creates a system broadcast announcement to be dispatched to active users (FR-NTF-07).
    /// </summary>
    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateAnnouncement(
        [FromBody] CreateAnnouncementRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<Guid> result = await sender
            .Send(new CreateAnnouncementCommand(userId, request.Title, request.Body), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Accepted(new { id = result.Value })
            : new ObjectResult(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }
}
