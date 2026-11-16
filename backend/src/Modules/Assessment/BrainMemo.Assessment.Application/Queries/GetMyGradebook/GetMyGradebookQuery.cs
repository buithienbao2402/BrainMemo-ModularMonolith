using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetMyGradebook;

public sealed record GetMyGradebookQuery(Guid CourseId, Guid UserId) : IQuery<GradebookResponseDto>;
