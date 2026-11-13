using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Course.Application.Queries.ListProfileCourses;

public sealed record ListProfileCoursesQuery(
    Guid TargetUserId,
    Guid? ViewerUserId,
    string? Relation,
    int Page,
    int PageSize) : IQuery<Page<CourseCardDto>>;
