using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Notification.Application.Commands.CreateAnnouncement;

public sealed record CreateAnnouncementCommand(
    Guid CreatedByUserId,
    string Title,
    string Body) : ICommand<Guid>;
