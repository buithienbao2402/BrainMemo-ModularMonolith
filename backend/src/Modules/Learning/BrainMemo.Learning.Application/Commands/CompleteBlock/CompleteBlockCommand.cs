using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Commands.CompleteBlock;

public sealed record CompleteBlockCommand(
    Guid CourseId,
    Guid BlockId,
    Guid CurrentUserId) : ICommand<CourseProgressDto>;
