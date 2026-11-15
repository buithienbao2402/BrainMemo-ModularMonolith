using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Course.Application.Queries.ListEnrollments;

public sealed record ListEnrollmentsQuery(
    Guid CourseId,
    Guid CurrentUserId,
    string? Status,
    int Page,
    int PageSize) : IQuery<PagedResult<EnrollmentDto>>;
