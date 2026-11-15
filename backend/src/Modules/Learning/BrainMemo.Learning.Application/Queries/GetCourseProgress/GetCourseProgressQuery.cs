using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Queries.GetCourseProgress;

public sealed record GetCourseProgressQuery(
    Guid CourseId,
    Guid CurrentUserId) : IQuery<CourseProgressDto>;
