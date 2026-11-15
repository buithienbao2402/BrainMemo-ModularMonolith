using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Commands.AnswerPracticeQuestion;

public sealed record PracticeAnswerResultDto(
    bool? IsCorrect,
    string? Explanation);

public sealed record AnswerPracticeQuestionCommand(
    Guid CourseId,
    Guid BlockId,
    Guid? CurrentUserId,
    AnswerPayload Answer) : ICommand<PracticeAnswerResultDto>;
