using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.SubmitQuizAttempt;

public sealed record SubmitQuizAttemptCommand(
    Guid AttemptId,
    Guid UserId) : ICommand<QuizSubmitResultDto>;
