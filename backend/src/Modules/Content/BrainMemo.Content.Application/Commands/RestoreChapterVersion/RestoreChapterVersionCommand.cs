using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Commands.RestoreChapterVersion;

public sealed record RestoreChapterVersionCommand(
    Guid CourseId,
    Guid ChapterId,
    int VersionNo,
    Guid RequesterUserId) : ICommand<ChapterDetailDto>;
