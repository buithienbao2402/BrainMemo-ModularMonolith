using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Profile.Contracts.Dtos;

namespace BrainMemo.Profile.Application.Queries.GetPublicProfile;

public sealed record GetPublicProfileQuery(Guid UserId) : IQuery<PublicProfileDto>;
