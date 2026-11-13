using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.DTOs;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Application.Queries.ListNotifications;

internal sealed class ListNotificationsQueryHandler(
    INotificationRepository notificationRepository) : IQueryHandler<ListNotificationsQuery, PagedResult<NotificationDto>>
{
    public async Task<Result<PagedResult<NotificationDto>>> Handle(ListNotificationsQuery request, CancellationToken cancellationToken)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize <= 0 ? 20 : request.PageSize, 1, 50);

        PagedResult<NotificationItem> pagedItems = await notificationRepository
            .ListForUserAsync(request.UserId, request.UnreadOnly, page, pageSize, cancellationToken)
            .ConfigureAwait(false);

        List<NotificationDto> dtos = new(pagedItems.Items.Count);
        foreach (NotificationItem item in pagedItems.Items)
        {
            JsonElement payloadElement;
            try
            {
                using JsonDocument doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(item.PayloadJson) ? "{}" : item.PayloadJson);
                payloadElement = doc.RootElement.Clone();
            }
            catch
            {
                using JsonDocument fallback = JsonDocument.Parse("{}");
                payloadElement = fallback.RootElement.Clone();
            }

            string? title = item.Announcement?.Title;
            string? body = item.Announcement?.Body;

            dtos.Add(new NotificationDto(
                item.Id,
                item.Type.ToString().ToUpperInvariant(),
                payloadElement,
                title,
                body,
                item.ReadAt,
                item.CreatedAt));
        }

        return new PagedResult<NotificationDto>(
            dtos,
            pagedItems.Page,
            pagedItems.PageSize,
            pagedItems.TotalItems);
    }
}
