using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetComponent;

public sealed record GetComponentQuery(Guid CourseId, Guid BlockId) : IQuery<ComponentDto>;
