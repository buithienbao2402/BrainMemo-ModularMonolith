using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Queries.ListAssessableBlocks;

public sealed record ListAssessableBlocksQuery(Guid CourseId) : IQuery<IReadOnlyList<ComponentDto>>;
