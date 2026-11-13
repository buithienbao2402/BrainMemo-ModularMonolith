using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Course.Application.Queries.GetCourse;

public sealed record GetCourseQuery(
    Guid CourseId,
    Guid? ViewerUserId) : IQuery<CourseDto>;
