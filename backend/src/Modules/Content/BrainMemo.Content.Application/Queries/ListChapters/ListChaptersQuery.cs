using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Queries.ListChapters;

public sealed record ListChaptersQuery(
    Guid CourseId,
    Guid? RequesterUserId) : IQuery<IReadOnlyList<ChapterSummaryDto>>;
