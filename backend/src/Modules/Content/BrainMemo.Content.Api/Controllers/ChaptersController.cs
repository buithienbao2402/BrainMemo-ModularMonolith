using System.Security.Claims;
using BrainMemo.Content.Api.DTOs;
using BrainMemo.Content.Application.Commands.CreateChapter;
using BrainMemo.Content.Application.Commands.DeleteChapter;
using BrainMemo.Content.Application.Commands.PublishChapter;
using BrainMemo.Content.Application.Commands.ReorderChapters;
using BrainMemo.Content.Application.Commands.RestoreChapterVersion;
using BrainMemo.Content.Application.Commands.SaveChapterDraft;
using BrainMemo.Content.Application.Queries.GetChapterDraft;
using BrainMemo.Content.Application.Queries.ListChapters;
using BrainMemo.Content.Application.Queries.ListChapterVersions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Content.Api.Controllers;

[ApiController]
[Route("api/v1/courses/{courseId:guid}/chapters")]
public sealed class ChaptersController(ISender sender) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ChapterSummaryDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListChapters([FromRoute] Guid courseId, CancellationToken ct)
    {
        Guid? viewerUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        ListChaptersQuery query = new(courseId, viewerUserId);

        Result<IReadOnlyList<ChapterSummaryDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost]
    [ProducesResponseType<ChapterDetailDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateChapter(
        [FromRoute] Guid courseId,
        [FromBody] CreateChapterRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateChapterCommand command = new(
            CourseId: courseId,
            RequesterUserId: userId,
            Title: request.Title,
            Description: request.Description);

        Result<ChapterDetailDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? CreatedAtAction(nameof(GetChapterDraft), new { courseId, chapterId = result.Value.Id }, result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPut("order")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReorderChapters(
        [FromRoute] Guid courseId,
        [FromBody] ReorderChaptersRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ReorderChaptersCommand command = new(
            CourseId: courseId,
            RequesterUserId: userId,
            ChapterIds: request.ChapterIds);

        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("{chapterId:guid}")]
    [ProducesResponseType<ChapterDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChapterDraft(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        GetChapterDraftQuery query = new(
            CourseId: courseId,
            ChapterId: chapterId,
            RequesterUserId: userId);

        Result<ChapterDetailDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPut("{chapterId:guid}")]
    [ProducesResponseType<ChapterDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> SaveChapterDraft(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        [FromBody] SaveChapterRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        SaveChapterDraftCommand command = new(
            CourseId: courseId,
            ChapterId: chapterId,
            RequesterUserId: userId,
            BaseVersionNo: request.BaseVersionNo,
            Title: request.Title,
            Description: request.Description,
            Blocks: request.Blocks);

        Result<ChapterDetailDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("{chapterId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteChapter(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        DeleteChapterCommand command = new(
            CourseId: courseId,
            ChapterId: chapterId,
            RequesterUserId: userId);

        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost("{chapterId:guid}/publish")]
    [ProducesResponseType<ChapterDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> PublishChapter(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        PublishChapterCommand command = new(courseId, chapterId, userId);
        Result<ChapterDetailDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("{chapterId:guid}/versions")]
    [ProducesResponseType<IReadOnlyList<ChapterVersionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListChapterVersions(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListChapterVersionsQuery query = new(courseId, chapterId, userId, page, pageSize);
        Result<IReadOnlyList<ChapterVersionDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost("{chapterId:guid}/versions/{versionNo:int}/restore")]
    [ProducesResponseType<ChapterDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> RestoreChapterVersion(
        [FromRoute] Guid courseId,
        [FromRoute] Guid chapterId,
        [FromRoute] int versionNo,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        RestoreChapterVersionCommand command = new(courseId, chapterId, versionNo, userId);
        Result<ChapterDetailDto> result = await sender.Send(command, ct).ConfigureAwait(false);

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
