using System.Security.Claims;
using BrainMemo.AI.Api.DTOs;
using BrainMemo.AI.Application.Commands;
using BrainMemo.AI.Application.DTOs;
using BrainMemo.AI.Application.Queries;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.AI.Api.Controllers;

[ApiController]
[Authorize]
public sealed class AdminSettingsController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/admin/settings")]
    [ProducesResponseType<SystemSettingsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<SystemSettingsDto> result = await sender
            .Send(new GetAdminSettingsQuery(userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapError(result.Error);
    }

    [HttpPut("api/v1/admin/settings")]
    [ProducesResponseType<SystemSettingsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] SystemSettingsRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UpdateAdminSettingsCommand command = new(
            request.AiDailyQuota,
            request.AiLlmProvider,
            userId);

        Result<SystemSettingsDto> result = await sender
            .Send(command, ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapError(result.Error);
    }

    private IActionResult MapError(Error error) => new ObjectResult(error);

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId) && userId != Guid.Empty;
    }
}
