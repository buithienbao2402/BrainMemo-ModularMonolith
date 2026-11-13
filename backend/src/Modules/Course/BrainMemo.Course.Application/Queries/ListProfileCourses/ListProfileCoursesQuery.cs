using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Queries.ListProfileCourses;

public sealed record ListProfileCoursesQuery(
    Guid UserId,
    Guid? ViewerUserId,
    int Page = 1,
    int PageSize = 12) : IQuery<PagedResult<CourseCardDto>>;
