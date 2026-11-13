using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.Queries.ListResources;

public sealed record ListResourcesQuery(
    Guid CourseId,
    Guid RequesterUserId) : IQuery<IReadOnlyList<ResourceDto>>;
