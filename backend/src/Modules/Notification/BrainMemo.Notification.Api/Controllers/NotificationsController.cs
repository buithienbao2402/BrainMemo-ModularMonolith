using System.Security.Claims;
using BrainMemo.Notification.Application.Commands.DeleteNotification;
using BrainMemo.Notification.Application.Commands.MarkAllNotificationsRead;
using BrainMemo.Notification.Application.Commands.MarkNotificationRead;
using BrainMemo.Notification.Application.DTOs;
using BrainMemo.Notification.Application.Queries.GetUnreadCount;
using BrainMemo.Notification.Application.Queries.ListNotifications;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Notification.Api.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public sealed class NotificationsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Lists in-app notifications for the current user (FR-NTF-04).
    /// </summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<NotificationDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListNotifications(
        [FromQuery] bool? unreadOnly,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListNotificationsQuery query = new(
            userId,
            unreadOnly ?? false,
            page ?? 1,
            pageSize ?? 20);

        Result<PagedResult<NotificationDto>> result = await sender
            .Send(query, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(new
            {
                items = result.Value.Items,
                meta = new
                {
                    page = result.Value.Page,
                    pageSize = result.Value.PageSize,
                    totalCount = result.Value.TotalItems,
                    totalPages = result.Value.TotalPages,
                },
            })
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Retrieves count of unread in-app notifications for polling (FR-NTF-04).
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<int> result = await sender
            .Send(new GetUnreadCountQuery(userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(new { count = result.Value })
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Marks a specific notification as read (FR-NTF-05).
    /// </summary>
    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result result = await sender
            .Send(new MarkNotificationReadCommand(userId, id), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Marks all unread notifications of the current user as read (FR-NTF-05).
    /// </summary>
    [HttpPost("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result result = await sender
            .Send(new MarkAllNotificationsReadCommand(userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Soft-deletes a notification from user view (FR-NTF-06).
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteNotification(
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result result = await sender
            .Send(new DeleteNotificationCommand(userId, id), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
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
