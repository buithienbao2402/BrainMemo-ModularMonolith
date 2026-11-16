using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetSubmissionForGrading;

public sealed record GetSubmissionForGradingQuery(Guid SubmissionId) : IQuery<GradingSubmissionDto>;
