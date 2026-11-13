using BrainMemo.Profile.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Profile.Application.Abstractions;

public interface IProfileRepository
{
    Task<UserProfile?> FindByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<IReadOnlyList<UserProfile>> FindByUserIdsAsync(IReadOnlyList<Guid> userIds, CancellationToken ct = default);

    Task<Result> AddAsync(UserProfile profile, CancellationToken ct = default);

    Task<Result> UpdateAsync(UserProfile profile, CancellationToken ct = default);
}
