using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Course.Application.Queries.ListEnrollmentRequests;

public sealed record ListEnrollmentRequestsQuery(
    Guid CourseId,
    Guid CurrentUserId,
    string? Decision,
    int Page,
    int PageSize) : IQuery<PagedResult<EnrollmentRequestDto>>;
