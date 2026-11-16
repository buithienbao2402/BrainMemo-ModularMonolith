using System.Security.Claims;
using BrainMemo.Content.Application.Commands.Questions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Application.Queries.Questions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Content.Api.Controllers;

[ApiController]
[Route("api/v1/courses/{courseId:guid}")]
public sealed class QuestionsController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpGet("question-bank")]
    [ProducesResponseType<QuestionBankDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuestionBank(
        [FromRoute] Guid courseId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetQuestionBankQuery query = new(courseId, userId);
        Result<QuestionBankDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPut("question-bank")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetDifficultyScheme(
        [FromRoute] Guid courseId,
        [FromBody] SetDifficultySchemeRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        SetDifficultySchemeCommand command = new(courseId, userId, request.DifficultyScheme);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpGet("questions")]
    [ProducesResponseType<QuestionListResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListQuestions(
        [FromRoute] Guid courseId,
        [FromQuery] string? tag,
        [FromQuery] byte? difficultyCode,
        [FromQuery] string? type,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListQuestionsQuery query = new(courseId, userId, tag, difficultyCode, type, status, page, pageSize);
        Result<QuestionListResponseDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPost("questions")]
    [ProducesResponseType<QuestionResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateQuestion(
        [FromRoute] Guid courseId,
        [FromBody] QuestionUpsertDto request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateQuestionCommand command = new(courseId, userId, request);
        Result<QuestionResponseDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpGet("questions/{questionId:guid}")]
    [ProducesResponseType<QuestionResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuestion(
        [FromRoute] Guid courseId,
        [FromRoute] Guid questionId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetQuestionQuery query = new(courseId, questionId, userId);
        Result<QuestionResponseDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPut("questions/{questionId:guid}")]
    [ProducesResponseType<QuestionResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UpdateQuestion(
        [FromRoute] Guid courseId,
        [FromRoute] Guid questionId,
        [FromBody] QuestionUpsertDto request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UpdateQuestionCommand command = new(courseId, questionId, userId, request);
        Result<QuestionResponseDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPut("questions/{questionId:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> SetQuestionStatus(
        [FromRoute] Guid courseId,
        [FromRoute] Guid questionId,
        [FromBody] SetQuestionStatusRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        SetQuestionStatusCommand command = new(courseId, questionId, userId, request.Status);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpGet("questions/{questionId:guid}/usage")]
    [ProducesResponseType<QuestionUsageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetQuestionUsage(
        [FromRoute] Guid courseId,
        [FromRoute] Guid questionId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetQuestionUsageQuery query = new(courseId, questionId, userId);
        Result<QuestionUsageDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpPost("questions/import")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType<ImportQuestionsResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ImportQuestions(
        [FromRoute] Guid courseId,
        IFormFile file,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new Error("FILE_EMPTY", "Tệp tải lên không được rỗng."));
        }

        using Stream stream = file.OpenReadStream();
        ImportQuestionsCommand command = new(courseId, userId, stream, file.FileName);
        Result<ImportQuestionsResultDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : ProblemFromError(result.Error);
    }

    [Authorize]
    [HttpGet("questions/export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExportQuestions(
        [FromRoute] Guid courseId,
        [FromQuery] string format = "csv",
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ExportQuestionsQuery query = new(courseId, userId, format);
        Result<ExportQuestionsResultDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? File(result.Value.Content, result.Value.ContentType, result.Value.FileName)
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
            "COURSE_NOT_FOUND" or "QUESTION_NOT_FOUND" or "NOT_FOUND" => StatusCodes.Status404NotFound,
            "FORBIDDEN" => StatusCodes.Status403Forbidden,
            "UNAUTHENTICATED" => StatusCodes.Status401Unauthorized,
            "INVALID_STATE" => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status400BadRequest
        };

        return StatusCode(statusCode, error);
    }
}
