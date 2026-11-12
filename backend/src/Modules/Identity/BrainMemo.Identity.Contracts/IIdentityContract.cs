using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Contracts;

/// <summary>
/// Synchronous contract exposed by the Identity module (contracts/identity.md, Contract Version 1).
/// </summary>
public interface IIdentityContract
{
    Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default);

    Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Early check only; does NOT replace the atomic last-admin lock check inside <see cref="LockAccount"/>.
    /// </summary>
    Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default);

    Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default);

    Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default);

    Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default);

    Task<Result> LockAccount(
        Guid userId,
        LockType type,
        DateTimeOffset? until,
        string reason,
        Guid sanctionId,
        Guid actorAdminId,
        CancellationToken ct = default);

    Task<Result> UnlockAccount(
        Guid userId,
        string reason,
        Guid actorAdminId,
        CancellationToken ct = default);
}

