using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Queries.GetMyAssignmentSubmission;

public sealed record GetMyAssignmentSubmissionQuery(
    Guid CourseId,
    Guid AssignmentBlockId,
    Guid UserId) : IQuery<SubmissionDto>;
