using System.Security.Claims;
using BrainMemo.Learning.Application.Commands.SaveAssignmentSubmissionDraft;
using BrainMemo.Learning.Application.Commands.SubmitAssignment;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Application.Queries.GetMyAssignmentSubmission;
using BrainMemo.Learning.Application.Queries.ListPendingSubmissions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Learning.Api.Controllers;

[ApiController]
[Authorize]
public sealed class AssignmentsController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assignments/{blockId:guid}/submission")]
    [ProducesResponseType<SubmissionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMySubmission(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var query = new GetMyAssignmentSubmissionQuery(courseId, blockId, userId);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [HttpPut("api/v1/courses/{courseId:guid}/assignments/{blockId:guid}/submission")]
    [ProducesResponseType<SubmissionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SaveSubmissionDraft(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromBody] SubmissionUpsertDto payload,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var command = new SaveAssignmentSubmissionDraftCommand(courseId, blockId, userId, payload);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = result.Error?.Code == "ALREADY_SUBMITTED" ? 409 : 400 };
    }

    [HttpPost("api/v1/courses/{courseId:guid}/assignments/{blockId:guid}/submission/submit")]
    [ProducesResponseType<SubmissionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SubmitAssignment(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var command = new SubmitAssignmentCommand(courseId, blockId, userId);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = result.Error?.Code == "ALREADY_SUBMITTED" ? 409 : 400 };
    }

    [HttpGet("api/v1/courses/{courseId:guid}/submissions/pending")]
    [ProducesResponseType<IReadOnlyList<PendingSubmissionItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPendingSubmissions(
        [FromRoute] Guid courseId,
        CancellationToken ct)
    {
        var query = new ListPendingSubmissionsQuery(courseId);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
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
