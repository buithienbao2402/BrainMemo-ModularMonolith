using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Notification.Application.Queries.GetUnreadCount;

public sealed record GetUnreadCountQuery(Guid UserId) : IQuery<int>;
