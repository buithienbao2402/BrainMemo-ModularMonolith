using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Commands.UpsertComponent;

public sealed record UpsertComponentCommand(
    Guid CourseId,
    Guid BlockId,
    decimal CourseWeight,
    IReadOnlyList<ComponentCloWeightDto>? CloWeights = null) : ICommand<ComponentDto>;
