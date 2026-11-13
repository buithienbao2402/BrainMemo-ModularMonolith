using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Notification.Application.Commands.MarkAllNotificationsRead;

public sealed record MarkAllNotificationsReadCommand(Guid UserId) : ICommand;
