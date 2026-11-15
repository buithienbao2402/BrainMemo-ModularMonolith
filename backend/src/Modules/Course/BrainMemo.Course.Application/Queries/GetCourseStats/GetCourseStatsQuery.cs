using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Queries.GetCourseStats;

public sealed record GetCourseStatsQuery(Guid CourseId, Guid CurrentUserId) : IQuery<CourseStatsDto>;
