using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Queries.ListPendingSubmissions;

public sealed record ListPendingSubmissionsQuery(Guid CourseId)
    : IQuery<IReadOnlyList<PendingSubmissionItemDto>>;
