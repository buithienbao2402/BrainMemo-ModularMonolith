using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ListQuizAttempts;

public sealed record ListQuizAttemptsQuery(
    Guid UserId,
    Guid QuizBlockId) : IQuery<IReadOnlyList<QuizAttemptSummaryDto>>;
