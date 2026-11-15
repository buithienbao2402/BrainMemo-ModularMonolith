using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.DecideEnrollmentRequest;

public sealed record DecideEnrollmentRequestCommand(
    Guid CourseId,
    Guid RequestId,
    Guid OwnerUserId,
    string Decision) : ICommand;
