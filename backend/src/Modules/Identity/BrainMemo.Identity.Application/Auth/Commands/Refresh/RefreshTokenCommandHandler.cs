using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Options;

namespace BrainMemo.Identity.Application.Auth.Commands.Refresh;

public sealed class RefreshTokenCommandHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IJwtTokenGenerator jwtTokenGenerator,
    IOptions<IdentityJwtOptions> jwtOptions,
    IClock clock,
    IPostCommitEventQueue? postCommitEvents = null) : ICommandHandler<RefreshTokenCommand, AuthTokensResult>
{
    public async Task<Result<AuthTokensResult>> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RawRefreshToken))
        {
            return Error.Unauthenticated("Phiên đăng nhập không tồn tại hoặc đã hết hạn.");
        }

        string rawOldToken = request.RawRefreshToken.Trim();
        byte[] oldTokenHash = tokenCryptoService.HashToken(rawOldToken);
        DateTimeOffset utcNow = clock.UtcNow;

        RefreshSession? session = await authRepository.FindSessionByTokenHashAsync(oldTokenHash, ct).ConfigureAwait(false);
        if (session is null || !session.IsActive(utcNow))
        {
            return Error.Unauthenticated("Phiên đăng nhập không tồn tại hoặc đã hết hạn.");
        }

        User? user = await authRepository.FindUserByIdAsync(session.UserId, ct).ConfigureAwait(false);
        if (user is null)
        {
            return Error.Unauthenticated("Không tìm thấy người dùng.");
        }

        // Auto-unlock temporary lock if expired at refresh time.
        Guid? unlockedSanctionId = user.UnlockIfExpired(utcNow);
        if (unlockedSanctionId.HasValue)
        {
            user.ClearDomainEvents();
            await authRepository.SaveUserAsync(user, ct).ConfigureAwait(false);
            postCommitEvents?.Enqueue(new AccountUnlocked(
                UuidV7.NewGuid(utcNow),
                utcNow,
                user.Id,
                unlockedSanctionId.Value,
                UnlockKind.AutoExpired));
        }

        if (!user.IsEffectivelyActive(utcNow))
        {
            await authRepository
                .RevokeAllUserSessionsAsync(user.Id, SessionRevokeReason.AccountLocked, utcNow, ct)
                .ConfigureAwait(false);

            Dictionary<string, object?> metadata = new(StringComparer.OrdinalIgnoreCase)
            {
                ["lockedUntil"] = user.LockedUntil,
                ["lockReason"] = user.LockReason,
            };

            return new Error(
                ErrorCodes.AccountLocked,
                "Tài khoản của bạn đang bị khóa.",
                Metadata: metadata);
        }

        string newRawRefreshToken = tokenCryptoService.GenerateOpaqueToken();
        byte[] newTokenHash = tokenCryptoService.HashToken(newRawRefreshToken);
        DateTimeOffset newExpiresAt = utcNow.AddDays(jwtOptions.Value.RefreshTokenDays);

        // Atomic conditional rotation: only one concurrent refresh wins (THIET_KE_CSDL §3.1.6.3).
        bool rotated = await authRepository.TryRotateSessionAsync(
            oldTokenHash: oldTokenHash,
            newTokenHash: newTokenHash,
            newExpiresAt: newExpiresAt,
            utcNow: utcNow,
            ct: ct).ConfigureAwait(false);

        if (!rotated)
        {
            return Error.Unauthenticated(
                "Phiên đăng nhập đã được làm mới từ yêu cầu khác hoặc đã hết hạn.");
        }

        bool isAdmin = await authRepository.IsUserAdminAsync(user.Id, ct).ConfigureAwait(false);

        string accessToken = jwtTokenGenerator.GenerateAccessToken(
            user.Id,
            user.Email,
            user.IsEmailVerified,
            isAdmin,
            user.AccountStatus,
            utcNow);

        int expiresInSeconds = (int)TimeSpan.FromMinutes(jwtOptions.Value.AccessTokenMinutes).TotalSeconds;

        return new AuthTokensResult(
            RawRefreshToken: newRawRefreshToken,
            AccessToken: accessToken,
            ExpiresIn: expiresInSeconds,
            ExpiresAt: newExpiresAt,
            User: new CurrentUserDto(
                Id: user.Id,
                Email: user.Email,
                EmailVerified: user.IsEmailVerified,
                IsAdmin: isAdmin,
                AccountStatus: user.AccountStatus.ToDatabaseValue()));
    }
}
