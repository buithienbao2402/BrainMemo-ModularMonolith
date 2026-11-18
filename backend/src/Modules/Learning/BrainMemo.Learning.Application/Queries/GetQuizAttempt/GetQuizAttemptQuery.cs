using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetQuizAttempt;

public sealed record GetQuizAttemptQuery(
    Guid AttemptId,
    Guid UserId) : IQuery<QuizAttemptDto>;
