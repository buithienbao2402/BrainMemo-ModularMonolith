using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Commands.SaveAssignmentSubmissionDraft;

public sealed record SaveAssignmentSubmissionDraftCommand(
    Guid CourseId,
    Guid AssignmentBlockId,
    Guid UserId,
    SubmissionUpsertDto Payload) : ICommand<SubmissionDto>;
