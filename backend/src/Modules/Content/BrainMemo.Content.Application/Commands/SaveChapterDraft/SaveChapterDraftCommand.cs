using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Commands.SaveChapterDraft;

public sealed record SaveChapterDraftCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid RequesterUserId,
    int BaseVersionNo,
    string Title,
    string? Description,
    IReadOnlyList<BlockDto> Blocks) : ICommand<ChapterDetailDto>;
