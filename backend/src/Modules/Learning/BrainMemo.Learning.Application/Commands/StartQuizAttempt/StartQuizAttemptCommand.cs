using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.StartQuizAttempt;

public sealed record StartQuizAttemptCommand(
    Guid UserId,
    Guid CourseId,
    Guid QuizBlockId,
    string? Password = null) : ICommand<QuizAttemptDto>;
