using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetStudentGradebook;

public sealed record GetStudentGradebookQuery(
    Guid CourseId,
    Guid StudentUserId,
    Guid RequesterUserId) : IQuery<GradebookResponseDto>;
