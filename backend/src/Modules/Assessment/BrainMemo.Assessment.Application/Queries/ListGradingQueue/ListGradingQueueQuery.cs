using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.ListGradingQueue;

public sealed record ListGradingQueueQuery(
    Guid CourseId,
    string? Kind,
    int Page = 1,
    int PageSize = 20) : IQuery<IReadOnlyList<GradingQueueItemDto>>;
