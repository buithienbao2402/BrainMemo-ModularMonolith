using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.SaveQuizAnswer;

public sealed record SaveQuizAnswerCommand(
    Guid AttemptId,
    Guid QuestionId,
    Guid UserId,
    AnswerPayloadDto Payload) : ICommand<SaveAnswerResultDto>;

public sealed record AnswerPayloadDto(
    IReadOnlyList<Guid>? SelectedOptionIds,
    string? TextAnswer,
    IReadOnlyDictionary<Guid, string>? Matches);
