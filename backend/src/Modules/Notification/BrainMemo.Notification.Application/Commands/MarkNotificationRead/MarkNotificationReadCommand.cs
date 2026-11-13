using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Notification.Application.Commands.MarkNotificationRead;

public sealed record MarkNotificationReadCommand(Guid UserId, Guid NotificationId) : ICommand;
