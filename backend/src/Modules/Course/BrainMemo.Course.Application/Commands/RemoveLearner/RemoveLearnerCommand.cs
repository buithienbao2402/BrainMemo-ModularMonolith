using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Commands.RemoveLearner;

public sealed record RemoveLearnerCommand(Guid CourseId, Guid OwnerUserId, Guid TargetUserId) : ICommand;
