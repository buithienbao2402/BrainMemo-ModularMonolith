using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Queries.ListMyCourses;

public sealed record ListMyCoursesQuery(
    Guid UserId,
    string Relation,
    int Page = 1,
    int PageSize = 12) : IQuery<PagedResult<CourseCardDto>>;
