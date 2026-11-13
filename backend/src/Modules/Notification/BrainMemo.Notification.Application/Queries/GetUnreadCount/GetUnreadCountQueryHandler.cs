using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Notification.Application.Queries.GetUnreadCount;

internal sealed class GetUnreadCountQueryHandler(
    INotificationRepository notificationRepository) : IQueryHandler<GetUnreadCountQuery, int>
{
    public async Task<Result<int>> Handle(GetUnreadCountQuery request, CancellationToken cancellationToken)
    {
        int count = await notificationRepository
            .GetUnreadCountAsync(request.UserId, cancellationToken)
            .ConfigureAwait(false);

        return count;
    }
}
