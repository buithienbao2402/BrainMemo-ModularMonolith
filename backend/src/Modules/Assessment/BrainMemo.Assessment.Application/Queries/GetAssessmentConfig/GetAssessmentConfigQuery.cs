using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetAssessmentConfig;

public sealed record GetAssessmentConfigQuery(Guid CourseId) : IQuery<AssessmentConfigDto>;
