using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.DTOs;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Notification.Application.Queries.ListNotifications;

public sealed record ListNotificationsQuery(
    Guid UserId,
    bool UnreadOnly,
    int Page,
    int PageSize) : IQuery<PagedResult<NotificationDto>>;
