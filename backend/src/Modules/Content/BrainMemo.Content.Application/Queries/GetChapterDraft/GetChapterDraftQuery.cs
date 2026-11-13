using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Queries.GetChapterDraft;

public sealed record GetChapterDraftQuery(
    Guid CourseId,
    Guid ChapterId,
    Guid RequesterUserId) : IQuery<ChapterDetailDto>;
