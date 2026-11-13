using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Notification.Application.Commands.DeleteNotification;

public sealed record DeleteNotificationCommand(Guid UserId, Guid NotificationId) : ICommand;
