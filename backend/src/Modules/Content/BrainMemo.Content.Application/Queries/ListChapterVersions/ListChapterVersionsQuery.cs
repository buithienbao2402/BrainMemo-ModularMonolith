using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Queries.ListChapterVersions;

public sealed record ListChapterVersionsQuery(
    Guid CourseId,
    Guid ChapterId,
    Guid RequesterUserId,
    int Page = 1,
    int PageSize = 20) : IQuery<IReadOnlyList<ChapterVersionDto>>;
