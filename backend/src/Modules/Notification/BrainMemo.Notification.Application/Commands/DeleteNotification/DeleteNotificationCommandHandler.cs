using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Notification.Application.Commands.DeleteNotification;

internal sealed class DeleteNotificationCommandHandler(
    INotificationRepository notificationRepository,
    IClock clock) : ICommandHandler<DeleteNotificationCommand>
{
    public async Task<Result> Handle(DeleteNotificationCommand request, CancellationToken cancellationToken)
    {
        NotificationItem? item = await notificationRepository
            .FindByIdAsync(request.NotificationId, request.UserId, cancellationToken)
            .ConfigureAwait(false);

        if (item is null)
        {
            return Error.NotFound("Không tìm thấy thông báo.");
        }

        item.SoftDelete(clock.UtcNow);
        return await notificationRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
