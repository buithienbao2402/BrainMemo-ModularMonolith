using System.Security.Claims;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Reviews.Commands.ReplyCourseReview;
using BrainMemo.Assessment.Application.Reviews.Commands.UpsertCourseReview;
using BrainMemo.Assessment.Application.Reviews.Queries.GetCourseReviewSummary;
using BrainMemo.Assessment.Application.Reviews.Queries.ListCourseReviews;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
public class CourseReviewController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/reviews")]
    [ProducesResponseType<ReviewsListResponseDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListReviews(
        [FromRoute] Guid courseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await sender.Send(new ListCourseReviewsQuery(courseId, page, pageSize), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/reviews/summary")]
    [ProducesResponseType<ReviewSummaryDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReviewSummary([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new GetCourseReviewSummaryQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result.Error);
    }

    [Authorize]
    [HttpPut("api/v1/courses/{courseId:guid}/reviews/me")]
    [ProducesResponseType<ReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpsertMyReview(
        [FromRoute] Guid courseId,
        [FromBody] UpsertReviewRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized();
        }

        var result = await sender.Send(
            new UpsertCourseReviewCommand(courseId, userId, request.Rating, request.CommentText),
            ct).ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result.Error);
    }

    [Authorize]
    [HttpPut("api/v1/courses/{courseId:guid}/reviews/{id:guid}/reply")]
    [ProducesResponseType<ReviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReplyReview(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        [FromBody] ReplyReviewRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid instructorUserId))
        {
            return Unauthorized();
        }

        var result = await sender.Send(
            new ReplyCourseReviewCommand(courseId, id, instructorUserId, request.ReplyText),
            ct).ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : ToErrorResult(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }

    private IActionResult ToErrorResult(Error error)
    {
        if (error.Code == ErrorCodes.NotFound)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = error.Message,
                Status = StatusCodes.Status404NotFound
            });
        }

        if (error.Code == ErrorCodes.Forbidden)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Forbidden",
                Detail = error.Message,
                Status = StatusCodes.Status403Forbidden
            });
        }

        if (error.Code == ErrorCodes.VersionConflict || error.Code == "CONFLICT")
        {
            return Conflict(new ProblemDetails
            {
                Title = "Conflict",
                Detail = error.Message,
                Status = StatusCodes.Status409Conflict
            });
        }

        return BadRequest(new ProblemDetails
        {
            Title = "Bad Request",
            Detail = error.Message,
            Status = StatusCodes.Status400BadRequest
        });
    }
}
