using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Profile.Application.Queries.GetPublicProfile;

public sealed class GetPublicProfileQueryHandler(
    IProfileContract profileContract) : IQueryHandler<GetPublicProfileQuery, PublicProfileDto>
{
    public Task<Result<PublicProfileDto>> Handle(GetPublicProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        return profileContract.GetPublicProfile(request.UserId, cancellationToken);
    }
}
