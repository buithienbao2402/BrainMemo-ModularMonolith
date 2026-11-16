using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.ListCourseGradebook;

public sealed record ListCourseGradebookQuery(
    Guid CourseId,
    Guid RequesterUserId,
    int Page = 1,
    int PageSize = 20) : IQuery<IReadOnlyList<GradebookResponseDto>>;
