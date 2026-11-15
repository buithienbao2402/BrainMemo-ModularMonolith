using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Queries.ListMyInvitations;

public sealed record ListMyInvitationsQuery(Guid UserId) : IQuery<IReadOnlyList<CourseCardDto>>;
