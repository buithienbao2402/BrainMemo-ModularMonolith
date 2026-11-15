using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.SetChapterAccess;

public sealed record SetChapterAccessCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid CurrentUserId,
    string AccessMode,
    string? Passcode) : ICommand;
