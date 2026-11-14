using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Commands.PublishChapter;

public sealed record PublishChapterCommand(
    Guid CourseId,
    Guid ChapterId,
    Guid RequesterUserId) : ICommand<ChapterDetailDto>;
