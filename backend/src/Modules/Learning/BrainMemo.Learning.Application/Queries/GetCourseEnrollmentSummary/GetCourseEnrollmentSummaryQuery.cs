using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Queries.GetCourseEnrollmentSummary;

public sealed record GetCourseEnrollmentSummaryQuery(
    Guid CourseId,
    Guid CurrentUserId) : IQuery<CourseEnrollmentSummaryDto>;
