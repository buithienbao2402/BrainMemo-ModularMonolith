using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Notification.Application.Commands.MarkNotificationRead;

internal sealed class MarkNotificationReadCommandHandler(
    INotificationRepository notificationRepository,
    IClock clock) : ICommandHandler<MarkNotificationReadCommand>
{
    public async Task<Result> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        NotificationItem? item = await notificationRepository
            .FindByIdAsync(request.NotificationId, request.UserId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            return Error.NotFound("Không tìm thấy thông báo.");
        }

        item.MarkAsRead(clock.UtcNow);
        return await notificationRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
