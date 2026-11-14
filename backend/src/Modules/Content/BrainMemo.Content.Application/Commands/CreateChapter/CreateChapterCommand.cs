using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Commands.CreateChapter;

public sealed record CreateChapterCommand(
    Guid CourseId,
    Guid RequesterUserId,
    string Title,
    string? Description) : ICommand<ChapterDetailDto>;
