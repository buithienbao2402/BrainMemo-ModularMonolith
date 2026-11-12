using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Options;

namespace BrainMemo.Identity.Application.Auth.Commands.Login;

public sealed class LoginCommandHandler(
    IIdentityAuthRepository authRepository,
    IPasswordHasher passwordHasher,
    ITokenCryptoService tokenCryptoService,
    IJwtTokenGenerator jwtTokenGenerator,
    IOptions<IdentityJwtOptions> jwtOptions,
    IClock clock,
    IPostCommitEventQueue? postCommitEvents = null) : ICommandHandler<LoginCommand, AuthTokensResult>
{
    private const string DummyBcryptHash = "$2a$11$e8kZ17Lw5v6jP.uH81k5ce6JtNf2qQhVdOsuu6X5uU3r0Qd/6j2wO";
    private const string InvalidCredentialsMessage = "Email hoặc mật khẩu không chính xác.";

    public async Task<Result<AuthTokensResult>> Handle(LoginCommand request, CancellationToken ct)
    {
        Result<EmailAddress> emailResult = EmailAddress.Create(request.Email);
        if (emailResult.IsFailure || string.IsNullOrWhiteSpace(request.Password))
        {
            return new Error(ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        DateTimeOffset utcNow = clock.UtcNow;
        User? user = await authRepository.FindUserByEmailAsync(emailResult.Value.Value, ct).ConfigureAwait(false);

        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            // Thwart user enumeration timing attacks via constant-time verification against dummy hash.
            passwordHasher.Verify(request.Password, DummyBcryptHash);
            return new Error(ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        if (!passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return new Error(ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        // Auto-unlock temporary lock if expired at login time (FR-IDN-03 / SD-01).
        Guid? unlockedSanctionId = user.UnlockIfExpired(utcNow);
        if (unlockedSanctionId.HasValue)
        {
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

        bool isAdmin = await authRepository.IsUserAdminAsync(user.Id, ct).ConfigureAwait(false);

        string rawRefreshToken = tokenCryptoService.GenerateOpaqueToken();
        byte[] tokenHash = tokenCryptoService.HashToken(rawRefreshToken);
        DateTimeOffset expiresAt = utcNow.AddDays(jwtOptions.Value.RefreshTokenDays);

        Result<RefreshSession> sessionResult = user.IssueRefreshSession(
            sessionId: UuidV7.NewGuid(utcNow),
            tokenHash: tokenHash,
            expiresAt: expiresAt,
            utcNow: utcNow,
            userAgent: request.UserAgent,
            ipAddress: request.IpAddress);

        if (sessionResult.IsFailure)
        {
            return sessionResult.Error;
        }

        user.ClearDomainEvents();

        Result saveResult = await authRepository.SaveUserAsync(user, ct).ConfigureAwait(false);
        if (saveResult.IsFailure)
        {
            return saveResult.Error;
        }

        string accessToken = jwtTokenGenerator.GenerateAccessToken(
            user.Id,
            user.Email,
            user.IsEmailVerified,
            isAdmin,
            user.AccountStatus,
            utcNow);

        int expiresInSeconds = (int)TimeSpan.FromMinutes(jwtOptions.Value.AccessTokenMinutes).TotalSeconds;

        return new AuthTokensResult(
            RawRefreshToken: rawRefreshToken,
            AccessToken: accessToken,
            ExpiresIn: expiresInSeconds,
            ExpiresAt: expiresAt,
            User: new CurrentUserDto(
                Id: user.Id,
                Email: user.Email,
                EmailVerified: user.IsEmailVerified,
                IsAdmin: isAdmin,
                AccountStatus: user.AccountStatus.ToDatabaseValue()));
    }
}
