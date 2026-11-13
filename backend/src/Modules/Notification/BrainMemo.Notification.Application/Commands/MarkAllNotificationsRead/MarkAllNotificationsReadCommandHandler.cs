using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Notification.Application.Commands.MarkAllNotificationsRead;

internal sealed class MarkAllNotificationsReadCommandHandler(
    INotificationRepository notificationRepository,
    IClock clock) : ICommandHandler<MarkAllNotificationsReadCommand>
{
    public async Task<Result> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        await notificationRepository
            .MarkAllAsReadAsync(request.UserId, clock.UtcNow, cancellationToken)
            .ConfigureAwait(false);

        return Result.Success();
    }
}
