using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Content.Application.Commands.ReorderChapters;

public sealed record ReorderChaptersCommand(
    Guid CourseId,
    Guid RequesterUserId,
    IReadOnlyList<Guid> ChapterIds) : ICommand;
