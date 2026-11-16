using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Commands.GradeSubmission;

public sealed record GradeSubmissionCommand(
    Guid SubmissionId,
    decimal Score,
    string? Feedback) : ICommand;
