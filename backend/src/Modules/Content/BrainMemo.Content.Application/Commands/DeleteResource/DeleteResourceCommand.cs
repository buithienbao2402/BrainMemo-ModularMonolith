using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Content.Application.Commands.DeleteResource;

public sealed record DeleteResourceCommand(
    Guid CourseId,
    Guid ResourceId,
    Guid RequesterUserId) : ICommand;
