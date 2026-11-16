using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.GetComponentScores;

public sealed record GetComponentScoresQuery(Guid CourseId, Guid BlockId) : IQuery<IReadOnlyList<ComponentScoresDto>>;
