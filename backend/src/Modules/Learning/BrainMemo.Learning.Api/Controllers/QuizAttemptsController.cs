using System.Security.Claims;
using BrainMemo.Learning.Application.Commands.SaveQuizAnswer;
using BrainMemo.Learning.Application.Commands.StartQuizAttempt;
using BrainMemo.Learning.Application.Commands.SubmitQuizAttempt;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Application.Queries.GetQuizAttempt;
using BrainMemo.Learning.Application.Queries.ListQuizAttempts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Learning.Api.Controllers;

[ApiController]
[Authorize]
public sealed class QuizAttemptsController(ISender sender) : ControllerBase
{
    public sealed record StartAttemptRequest(string? Password);

    public sealed record SaveAnswerRequest(
        IReadOnlyList<Guid>? SelectedOptionIds,
        string? TextAnswer,
        IReadOnlyDictionary<Guid, string>? Matches);

    [HttpPost("api/v1/courses/{courseId:guid}/quizzes/{blockId:guid}/attempts")]
    [ProducesResponseType<QuizAttemptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> StartAttempt(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromBody] StartAttemptRequest? request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var command = new StartQuizAttemptCommand(userId, courseId, blockId, request?.Password);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = result.Error?.Code == "Quiz.MaxAttemptsReached" ? 409 : 400 };
    }

    [HttpGet("api/v1/courses/{courseId:guid}/quizzes/{blockId:guid}/attempts")]
    [ProducesResponseType<IReadOnlyList<QuizAttemptSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAttempts(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var query = new ListQuizAttemptsQuery(userId, blockId);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/quiz-attempts/{id:guid}")]
    [ProducesResponseType<QuizAttemptDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAttempt(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var query = new GetQuizAttemptQuery(id, userId);
        var result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = 404 };
    }

    [HttpPut("api/v1/quiz-attempts/{id:guid}/answers/{questionId:guid}")]
    [ProducesResponseType<SaveAnswerResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> SaveAnswer(
        [FromRoute] Guid id,
        [FromRoute] Guid questionId,
        [FromBody] SaveAnswerRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var payload = new AnswerPayloadDto(request.SelectedOptionIds, request.TextAnswer, request.Matches);
        var command = new SaveQuizAnswerCommand(id, questionId, userId, payload);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error) { StatusCode = result.Error?.Code == "Attempt.NotActive" ? 409 : 400 };
    }

    [HttpPost("api/v1/quiz-attempts/{id:guid}/submit")]
    [ProducesResponseType<QuizSubmitResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitAttempt(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        var command = new SubmitQuizAttemptCommand(id, userId);
        var result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
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
