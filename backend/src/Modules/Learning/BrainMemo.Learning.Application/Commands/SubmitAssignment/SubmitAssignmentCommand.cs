using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Commands.SubmitAssignment;

public sealed record SubmitAssignmentCommand(
    Guid CourseId,
    Guid AssignmentBlockId,
    Guid UserId) : ICommand<SubmissionDto>;
