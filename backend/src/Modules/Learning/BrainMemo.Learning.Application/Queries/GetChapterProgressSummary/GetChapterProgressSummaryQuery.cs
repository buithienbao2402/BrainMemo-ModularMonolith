using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Queries.GetChapterProgressSummary;

public sealed record GetChapterProgressSummaryQuery(
    Guid CourseId,
    Guid ChapterId,
    Guid CurrentUserId) : IQuery<ChapterProgressSummaryDto>;
