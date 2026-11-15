using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Commands.AcceptInvitation;

public sealed record AcceptInvitationCommand(Guid CourseId, Guid UserId) : ICommand<EnrollmentDto>;
