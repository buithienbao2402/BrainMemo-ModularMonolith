using System.Security.Claims;
using BrainMemo.Content.Application.Commands.Questions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Application.Queries.Questions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Content.Api.Controllers;

[ApiController]
[Route("api/v1/courses/{courseId:guid}")]
public sealed class QuizzesController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpGet("quizzes/{blockId:guid}/exceptions")]
    [ProducesResponseType<IReadOnlyList<QuizExceptionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListQuizExceptions(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListQuizExceptionsQuery query = new(courseId, blockId, userId);
        Result<IReadOnlyList<QuizExceptionDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPut("quizzes/{blockId:guid}/exceptions/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpsertQuizException(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromRoute] Guid userId,
        [FromBody] QuizExceptionUpsertDto request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid requesterUserId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UpsertQuizExceptionCommand command = new(courseId, blockId, userId, requesterUserId, request);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpDelete("quizzes/{blockId:guid}/exceptions/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteQuizException(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromRoute] Guid userId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid requesterUserId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        DeleteQuizExceptionCommand command = new(courseId, blockId, userId, requesterUserId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : ProblemFromError(result.Error);
    }

    [AllowAnonymous]
    [HttpGet("chapters/{chapterId:guid}/quizzes")]
    [ProducesResponseType<IReadOnlyList<ChapterQuizSummaryDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListChapterQuizzes(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        Guid? requesterUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        ListChapterQuizzesQuery query = new(courseId, chapterId, requesterUserId);
        Result<IReadOnlyList<ChapterQuizSummaryDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }

    private IActionResult ProblemFromError(Error error)
    {
        int statusCode = error.Code switch
        {
            "COURSE_NOT_FOUND" or "CHAPTER_NOT_FOUND" or "QUIZ_NOT_FOUND" or "NOT_FOUND" => StatusCodes.Status404NotFound,
            "FORBIDDEN" => StatusCodes.Status403Forbidden,
            "UNAUTHENTICATED" => StatusCodes.Status401Unauthorized,
            "INVALID_STATE" => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status400BadRequest
        };

        return StatusCode(statusCode, error);
    }
}
