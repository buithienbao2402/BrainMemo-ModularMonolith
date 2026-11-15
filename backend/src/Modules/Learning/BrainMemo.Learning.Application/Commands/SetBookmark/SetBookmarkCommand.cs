using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Learning.Application.Commands.SetBookmark;

public sealed record SetBookmarkCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid CurrentUserId) : ICommand;
