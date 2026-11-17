using System.Security.Claims;
using BrainMemo.Messaging.Application.Commands;
using BrainMemo.Messaging.Application.DTOs;
using BrainMemo.Messaging.Application.Queries;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Messaging.Api.Controllers;

[ApiController]
[Authorize]
public sealed class MessagingController(ISender sender) : ControllerBase
{
    [HttpPost("api/v1/courses/{courseId:guid}/messages/conversations")]
    [ProducesResponseType<ConversationDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> OpenOrCreateConversation(
        [FromRoute] Guid courseId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<ConversationDto> result = await sender
            .Send(new OpenOrCreateConversationCommand(courseId, userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapError(result.Error);
    }

    [HttpGet("api/v1/messages/conversations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListConversations(
        [FromQuery] Guid? courseId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<PagedResult<ConversationDto>> result = await sender
            .Send(new ListConversationsQuery(userId, courseId, page, pageSize), ct)
            .ConfigureAwait(false);

        if (result.IsFailure) return MapError(result.Error);

        return Ok(new
        {
            items = result.Value.Items,
            meta = new
            {
                page = result.Value.Page,
                pageSize = result.Value.PageSize,
                totalItems = result.Value.TotalItems,
                totalPages = result.Value.TotalPages
            }
        });
    }

    [HttpGet("api/v1/messages/conversations/{id:guid}")]
    [ProducesResponseType<ConversationDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversation([FromRoute] Guid id, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<ConversationDto> result = await sender
            .Send(new GetConversationQuery(id, userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapError(result.Error);
    }

    [HttpGet("api/v1/messages/conversations/{id:guid}/messages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMessages(
        [FromRoute] Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<PagedResult<MessageDto>> result = await sender
            .Send(new ListMessagesQuery(id, userId, page, pageSize), ct)
            .ConfigureAwait(false);

        if (result.IsFailure) return MapError(result.Error);

        return Ok(new
        {
            items = result.Value.Items,
            meta = new
            {
                page = result.Value.Page,
                pageSize = result.Value.PageSize,
                totalItems = result.Value.TotalItems,
                totalPages = result.Value.TotalPages
            }
        });
    }

    [HttpPost("api/v1/messages/conversations/{id:guid}/messages")]
    [ProducesResponseType<MessageDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> SendMessage(
        [FromRoute] Guid id,
        [FromBody] SendMessageRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<MessageDto> result = await sender
            .Send(new SendMessageCommand(id, userId, request.Content, request.AttachmentUploadKey), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : MapError(result.Error);
    }

    [HttpPut("api/v1/messages/conversations/{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead([FromRoute] Guid id, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result result = await sender
            .Send(new MarkConversationReadCommand(id, userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? NoContent() : MapError(result.Error);
    }

    [HttpGet("api/v1/messages/unread-count")]
    [ProducesResponseType<UnreadMessagesCountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<UnreadMessagesCountDto> result = await sender
            .Send(new GetUnreadMessagesCountQuery(userId), ct)
            .ConfigureAwait(false);

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
