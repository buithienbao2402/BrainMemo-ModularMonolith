using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Commands.InviteLearner;

public sealed record InviteLearnerCommand(Guid CourseId, Guid OwnerUserId, string Email) : ICommand<EnrollmentDto>;
