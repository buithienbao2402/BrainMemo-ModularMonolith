using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Course.Application.Queries.ListMyCourses;

public sealed record ListMyCoursesQuery(
    Guid UserId,
    string Relation,
    int Page,
    int PageSize) : IQuery<Page<CourseCardDto>>;
