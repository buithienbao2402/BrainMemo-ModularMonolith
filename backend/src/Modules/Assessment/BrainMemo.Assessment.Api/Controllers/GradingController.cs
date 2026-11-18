using System.Security.Claims;
using BrainMemo.Assessment.Application.Commands.GradeAttemptManually;
using BrainMemo.Assessment.Application.Commands.GradeSubmission;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.GetAttemptForReview;
using BrainMemo.Assessment.Application.Queries.GetSubmissionForGrading;
using BrainMemo.Assessment.Application.Queries.ListGradingQueue;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
[Authorize]
public sealed class GradingController(ISender sender) : ControllerBase
{
    public sealed record ManualGradesRequest(
        IReadOnlyList<ManualQuestionGradeInput> Grades,
        string? OverallFeedback);

    public sealed record GradeSubmissionRequest(
        decimal Score,
        string? Feedback);

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/grading-queue")]
    [ProducesResponseType<IReadOnlyList<GradingQueueItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListGradingQueue(
        [FromRoute] Guid courseId,
        [FromQuery] string? kind,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var query = new ListGradingQueueQuery(courseId, kind, page, pageSize);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/assessment/quiz-attempts/{id:guid}/review")]
    [ProducesResponseType<AttemptReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAttemptForReview(
        [FromRoute] Guid id,
        CancellationToken ct = default)
    {
        var query = new GetAttemptForReviewQuery(id);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = 404 };
    }

    [HttpPut("api/v1/assessment/quiz-attempts/{id:guid}/manual-grades")]
    [ProducesResponseType<GradeAttemptManuallyResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GradeAttemptManually(
        [FromRoute] Guid id,
        [FromBody] ManualGradesRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var command = new GradeAttemptManuallyCommand(id, userId, request.Grades, request.OverallFeedback);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = 400 };
    }

    [HttpGet("api/v1/assessment/submissions/{id:guid}/grade")]
    [ProducesResponseType<GradingSubmissionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSubmissionForGrading(
        [FromRoute] Guid id,
        CancellationToken ct = default)
    {
        var query = new GetSubmissionForGradingQuery(id);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = 404 };
    }

    [HttpPut("api/v1/assessment/submissions/{id:guid}/grade")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GradeSubmission(
        [FromRoute] Guid id,
        [FromBody] GradeSubmissionRequest request,
        CancellationToken ct = default)
    {
        var command = new GradeSubmissionCommand(id, request.Score, request.Feedback);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error) { StatusCode = 400 };
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }
}
