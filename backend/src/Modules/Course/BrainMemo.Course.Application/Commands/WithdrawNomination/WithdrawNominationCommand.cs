using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.WithdrawNomination;

public sealed record WithdrawNominationCommand(Guid CourseId, Guid UserId) : ICommand;
