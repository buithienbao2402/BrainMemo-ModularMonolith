using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Commands.GradeAttemptManually;

public sealed record GradeAttemptManuallyCommand(
    Guid AttemptId,
    Guid GraderUserId,
    IReadOnlyList<ManualQuestionGradeInput> Grades,
    string? OverallFeedback) : ICommand<GradeAttemptManuallyResultDto>;
