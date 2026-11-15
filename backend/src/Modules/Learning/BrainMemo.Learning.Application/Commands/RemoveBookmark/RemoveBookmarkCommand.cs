using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Learning.Application.Commands.RemoveBookmark;

public sealed record RemoveBookmarkCommand(
    Guid CourseId,
    Guid CurrentUserId) : ICommand;
