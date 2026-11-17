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
public sealed class AiController(ISender sender) : ControllerBase
{
    [HttpPost("api/v1/courses/{courseId:guid}/ai/quiz-jobs")]
    [ProducesResponseType<AiJobDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> CreateQuizJob(
        [FromRoute] Guid courseId,
        [FromBody] AiJobRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateQuizJobCommand command = new(
            courseId,
            userId,
            request.SourceKind,
            request.SourceText,
            request.SourceChapterId,
            request.Count,
            request.Difficulty,
            request.TypeFilter);

        Result<AiJobDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Accepted($"/api/v1/ai/jobs/{result.Value.Id}", result.Value)
            : MapError(result.Error);
    }

    [HttpPost("api/v1/courses/{courseId:guid}/ai/flashcard-jobs")]
    [ProducesResponseType<AiJobDto>(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> CreateFlashcardJob(
        [FromRoute] Guid courseId,
        [FromBody] AiJobRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateFlashcardJobCommand command = new(
            courseId,
            userId,
            request.SourceKind,
            request.SourceText,
            request.SourceChapterId,
            request.Count);

        Result<AiJobDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Accepted($"/api/v1/ai/jobs/{result.Value.Id}", result.Value)
            : MapError(result.Error);
    }

    [HttpGet("api/v1/ai/jobs/{id:guid}")]
    [ProducesResponseType<AiJobDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAiJob(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        bool isAdmin = User.IsInRole("Admin");
        Result<AiJobDto> result = await sender.Send(new GetAiJobQuery(id, userId, isAdmin), ct).ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapError(result.Error);
    }

    [HttpGet("api/v1/ai/quota")]
    [ProducesResponseType<AiQuotaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetAiQuota(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<AiQuotaDto> result = await sender.Send(new GetAiQuotaQuery(userId), ct).ConfigureAwait(false);

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
