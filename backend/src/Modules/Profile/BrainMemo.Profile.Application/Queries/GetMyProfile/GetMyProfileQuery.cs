using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Profile.Application.DTOs;

namespace BrainMemo.Profile.Application.Queries.GetMyProfile;

public sealed record GetMyProfileQuery(Guid UserId) : IQuery<ProfileDto>;
