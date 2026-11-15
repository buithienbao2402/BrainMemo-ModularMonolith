using System.Security.Claims;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Learning.Api.DTOs;
using BrainMemo.Learning.Application.Commands.AnswerPracticeQuestion;
using BrainMemo.Learning.Application.Commands.CompleteBlock;
using BrainMemo.Learning.Application.Commands.RemoveBookmark;
using BrainMemo.Learning.Application.Commands.SetBookmark;
using BrainMemo.Learning.Application.Queries.GetChapterProgressSummary;
using BrainMemo.Learning.Application.Queries.GetCourseEnrollmentSummary;
using BrainMemo.Learning.Application.Queries.GetCourseProgress;
using BrainMemo.Learning.Application.Queries.ListMyBookmarks;
using BrainMemo.Learning.Application.Queries.ReadChapter;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Learning.Api.Controllers;

[ApiController]
public sealed class LearningController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/learn/chapters/{chapterId:guid}")]
    [ProducesResponseType<LearnChapterDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReadChapter(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        Guid? userId = TryGetCurrentUserId(out Guid id) ? id : null;
        ReadChapterQuery query = new(courseId, chapterId, userId);
        Result<LearnChapterDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost("api/v1/courses/{courseId:guid}/blocks/{blockId:guid}/complete")]
    [ProducesResponseType<CourseProgressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteBlock(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CompleteBlockCommand command = new(courseId, blockId, userId);
        Result<CourseProgressDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [HttpPost("api/v1/courses/{courseId:guid}/blocks/{blockId:guid}/practice-answer")]
    [ProducesResponseType<PracticeAnswerResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AnswerPracticeQuestion(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromBody] PracticeAnswerRequest request,
        CancellationToken ct)
    {
        Guid? userId = TryGetCurrentUserId(out Guid id) ? id : null;
        AnswerPayload payload = new(request.SelectedOptionIds, request.TextAnswer, null);
        AnswerPracticeQuestionCommand command = new(courseId, blockId, userId, payload);
        Result<PracticeAnswerResultDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("api/v1/courses/{courseId:guid}/progress")]
    [ProducesResponseType<CourseProgressDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCourseProgress([FromRoute] Guid courseId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetCourseProgressQuery query = new(courseId, userId);
        Result<CourseProgressDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPut("api/v1/courses/{courseId:guid}/bookmark")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SetBookmark(
        [FromRoute] Guid courseId,
        [FromBody] SetBookmarkRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        SetBookmarkCommand command = new(courseId, request.ChapterId, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("api/v1/courses/{courseId:guid}/bookmark")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RemoveBookmark([FromRoute] Guid courseId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        RemoveBookmarkCommand command = new(courseId, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("api/v1/me/bookmarks")]
    [ProducesResponseType<IReadOnlyList<BookmarkDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMyBookmarks(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListMyBookmarksQuery query = new(userId);
        Result<IReadOnlyList<BookmarkDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("api/v1/courses/{courseId:guid}/chapters/{chapterId:guid}/progress-summary")]
    [ProducesResponseType<ChapterProgressSummaryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChapterProgressSummary(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetChapterProgressSummaryQuery query = new(courseId, chapterId, userId);
        Result<ChapterProgressSummaryDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("api/v1/courses/{courseId:guid}/enrollments/summary")]
    [ProducesResponseType<CourseEnrollmentSummaryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseEnrollmentSummary(
        [FromRoute] Guid courseId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetCourseEnrollmentSummaryQuery query = new(courseId, userId);
        Result<CourseEnrollmentSummaryDto> result = await sender.Send(query, ct).ConfigureAwait(false);

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
