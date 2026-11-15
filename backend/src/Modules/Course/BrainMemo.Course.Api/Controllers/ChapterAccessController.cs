using System.Security.Claims;
using BrainMemo.Course.Api.DTOs;
using BrainMemo.Course.Application.Commands.SetChapterAccess;
using BrainMemo.Course.Application.Commands.UnlockChapter;
using BrainMemo.Course.Application.Queries.GetChapterAccess;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Course.Api.Controllers;

[ApiController]
public sealed class ChapterAccessController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpPut("api/v1/courses/{courseId:guid}/chapters/{chapterId:guid}/access")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetChapterAccess(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        [FromBody] SetChapterAccessRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        SetChapterAccessCommand command = new(courseId, chapterId, userId, request.AccessMode, request.Passcode);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("api/v1/courses/{courseId:guid}/chapters/{chapterId:guid}/access")]
    [ProducesResponseType<ChapterAccessConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChapterAccess(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        GetChapterAccessConfigQuery query = new(courseId, chapterId);
        Result<ChapterAccessConfigDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost("api/v1/courses/{courseId:guid}/chapters/{chapterId:guid}/unlock")]
    [HttpPost("api/v1/courses/{courseId:guid}/chapters/{chapterId:guid}/verify-passcode")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> UnlockChapter(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        [FromBody] UnlockChapterRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UnlockChapterCommand command = new(courseId, chapterId, userId, request.Passcode);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
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
