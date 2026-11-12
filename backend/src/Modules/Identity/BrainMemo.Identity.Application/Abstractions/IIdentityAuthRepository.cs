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
}
