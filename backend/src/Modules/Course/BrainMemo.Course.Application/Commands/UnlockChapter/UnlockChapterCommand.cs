using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.UnlockChapter;

public sealed record UnlockChapterCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid UserId,
    string Passcode) : ICommand;
