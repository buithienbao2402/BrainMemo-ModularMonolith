using System.Security.Claims;
using BrainMemo.Learning.Api.DTOs;
using BrainMemo.Learning.Application.Commands.CreateComment;
using BrainMemo.Learning.Application.Commands.DeleteComment;
using BrainMemo.Learning.Application.Commands.EditComment;
using BrainMemo.Learning.Application.Commands.PinComment;
using BrainMemo.Learning.Application.Commands.ResolveComment;
using BrainMemo.Learning.Application.Commands.UnpinComment;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Application.Queries.GetCommentsSummary;
using BrainMemo.Learning.Application.Queries.ListComments;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Learning.Api.Controllers;

[ApiController]
public sealed class CommentsController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/comments")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListComments(
        [FromRoute] Guid courseId,
        [FromQuery] Guid? chapterId,
        [FromQuery] bool? isResolved,
        [FromQuery] bool? mine,
        [FromQuery] string? search,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        Guid? currentUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        ListCommentsQuery query = new(
            courseId,
            chapterId,
            page ?? 1,
            pageSize ?? 20,
            currentUserId,
            isResolved,
            mine,
            search);

        Result<PagedResult<CommentDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(new
            {
                items = result.Value.Items,
                meta = new
                {
                    page = result.Value.Page,
                    pageSize = result.Value.PageSize,
                    totalItems = result.Value.TotalItems,
                    totalPages = result.Value.TotalPages
                }
            })
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost("api/v1/courses/{courseId:guid}/comments")]
    [ProducesResponseType<CommentDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateComment(
        [FromRoute] Guid courseId,
        [FromBody] CreateCommentRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateCommentCommand command = new(
            courseId,
            request.ChapterId,
            request.ParentCommentId,
            request.Content,
            userId,
            request.Title,
            request.BlockId);

        Result<CommentDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPatch("api/v1/comments/{id:guid}")]
    [ProducesResponseType<CommentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> EditComment(
        [FromRoute] Guid id,
        [FromBody] EditCommentRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        EditCommentCommand command = new(id, request.Content, userId);
        Result<CommentDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("api/v1/comments/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteComment(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        DeleteCommentCommand command = new(id, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPut("api/v1/comments/{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PinComment(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        PinCommentCommand command = new(id, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("api/v1/comments/{id:guid}/pin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnpinComment(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UnpinCommentCommand command = new(id, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPut("api/v1/comments/{id:guid}/resolve")]
    [ProducesResponseType<CommentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResolveComment(
        [FromRoute] Guid id,
        [FromBody] ResolveCommentRequest? request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ResolveCommentCommand command = new(id, request?.ResolvedCommentId, userId);
        Result<CommentDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("api/v1/comments/{id:guid}/resolve")]
    [ProducesResponseType<CommentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnresolveComment(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UnresolveCommentCommand command = new(id, userId);
        Result<CommentDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/comments/summary")]
    [ProducesResponseType<CommentsSummaryDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCommentsSummary(
        [FromRoute] Guid courseId,
        [FromQuery] Guid? chapterId,
        CancellationToken ct)
    {
        GetCommentsSummaryQuery query = new(courseId, chapterId);
        Result<CommentsSummaryDto> result = await sender.Send(query, ct).ConfigureAwait(false);

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
