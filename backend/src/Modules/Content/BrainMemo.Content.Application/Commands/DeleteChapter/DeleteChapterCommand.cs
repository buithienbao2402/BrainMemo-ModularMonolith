using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Content.Application.Commands.DeleteChapter;

public sealed record DeleteChapterCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid RequesterUserId) : ICommand;
