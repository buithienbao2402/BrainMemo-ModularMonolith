using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Commands.DeleteComponent;

public sealed record DeleteComponentCommand(Guid CourseId, Guid BlockId) : ICommand;
