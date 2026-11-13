using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Application.Abstractions;

/// <summary>
/// Persistence port for Identity authentication use cases backed by <c>idn_*</c> tables.
/// </summary>
public interface IIdentityAuthRepository
{
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default);

    Task<Result> AddUserAndSaveAsync(User user, CancellationToken ct = default);

    Task<Guid?> TryConsumeUserTokenAsync(
        UserTokenPurpose purpose,
        byte[] tokenHash,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<User?> FindUserByIdAsync(Guid userId, CancellationToken ct = default);

    Task<User?> FindUserByEmailAsync(string normalizedEmail, CancellationToken ct = default);

    Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct = default);

    Task<Result> SaveUserAsync(User user, CancellationToken ct = default);

    Task<RefreshSession?> FindSessionByTokenHashAsync(byte[] tokenHash, CancellationToken ct = default);

    Task<bool> TryRotateSessionAsync(
        byte[] oldTokenHash,
        byte[] newTokenHash,
        DateTimeOffset newExpiresAt,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<bool> RevokeSessionByTokenHashAsync(
        byte[] tokenHash,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<int> RevokeAllUserSessionsAsync(
        Guid userId,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<IReadOnlyList<RefreshSession>> GetActiveSessionsForUserAsync(
        Guid userId,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<RefreshSession?> FindSessionByIdAsync(Guid sessionId, CancellationToken ct = default);

    Task<bool> RevokeSessionByIdAsync(
        Guid sessionId,
        Guid userId,
        SessionRevokeReason reason,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task InvalidateUserTokensAsync(
        Guid userId,
        UserTokenPurpose purpose,
        DateTimeOffset utcNow,
        CancellationToken ct = default);
}
