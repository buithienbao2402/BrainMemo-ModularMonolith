using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetAttemptForReview;

public sealed record GetAttemptForReviewQuery(Guid AttemptId) : IQuery<AttemptReviewDto>;
