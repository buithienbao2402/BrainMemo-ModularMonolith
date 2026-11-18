using System.Security.Claims;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.GetComponentScores;
using BrainMemo.Assessment.Application.Queries.GetMyGradebook;
using BrainMemo.Assessment.Application.Queries.GetStudentGradebook;
using BrainMemo.Assessment.Application.Queries.ListCourseGradebook;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
[Authorize]
public sealed class GradebookController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assessment/gradebook/me")]
    [ProducesResponseType<GradebookResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyGradebook([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var result = await sender.Send(new GetMyGradebookQuery(courseId, userId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/gradebook/students/{userId:guid}")]
    [ProducesResponseType<GradebookResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStudentGradebook(
        [FromRoute] Guid courseId,
        [FromRoute] Guid userId,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid requesterId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var result = await sender.Send(new GetStudentGradebookQuery(courseId, userId, requesterId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error) { StatusCode = 404 };
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/gradebook")]
    [ProducesResponseType<IReadOnlyList<GradebookResponseDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListCourseGradebook(
        [FromRoute] Guid courseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid requesterId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var result = await sender.Send(new ListCourseGradebookQuery(courseId, requesterId, page, pageSize), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/components/{blockId:guid}/scores")]
    [ProducesResponseType<IReadOnlyList<ComponentScoresDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetComponentScores(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct = default)
    {
        var result = await sender.Send(new GetComponentScoresQuery(courseId, blockId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }
}
