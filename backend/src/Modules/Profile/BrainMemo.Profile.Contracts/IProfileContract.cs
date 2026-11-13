using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Profile.Contracts;

public interface IProfileContract
{
    Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default);

    Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default);
}
