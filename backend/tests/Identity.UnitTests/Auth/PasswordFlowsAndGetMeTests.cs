using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Commands.ChangePassword;
using BrainMemo.Identity.Application.Auth.Commands.ForgotPassword;
using BrainMemo.Identity.Application.Auth.Commands.ResetPassword;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Application.Auth.Queries.GetMe;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Security;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using Xunit;

namespace Identity.UnitTests.Auth;

public sealed class PasswordFlowsAndGetMeTests
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 13, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Commands_And_Queries_ToString_RedactSecrets()
    {
        ForgotPasswordCommand forgot = new("sensitive@example.com");
        ResetPasswordCommand reset = new("super-secret-token", "SecretNewPass123!");
        ChangePasswordCommand change = new(Guid.NewGuid(), "OldPass123!", "NewPass123!");
        GetMeQuery getMe = new(Guid.NewGuid());

        Assert.DoesNotContain("sensitive@example.com", forgot.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", forgot.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("super-secret-token", reset.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("SecretNewPass123!", reset.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", reset.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("OldPass123!", change.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("NewPass123!", change.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", change.ToString(), StringComparison.Ordinal);

        Assert.Contains("GetMeQuery", getMe.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-email")]
    public void ForgotPasswordCommandValidator_RejectsInvalidEmails(string? email)
    {
        ForgotPasswordCommandValidator validator = new();
        ValidationResult result = validator.Validate(new ForgotPasswordCommand(email));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ForgotPasswordCommandValidator_AcceptsValidEmail()
    {
        ForgotPasswordCommandValidator validator = new();
        ValidationResult result = validator.Validate(new ForgotPasswordCommand("user@example.com"));
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData(null, "ValidPass1!")]
    [InlineData("", "ValidPass1!")]
    [InlineData("   ", "ValidPass1!")]
    [InlineData("token", null)]
    [InlineData("token", "")]
    [InlineData("token", "   ")]
    [InlineData("token", "short")]
    public void ResetPasswordCommandValidator_RejectsInvalidInputs(string? token, string? newPassword)
    {
        ResetPasswordCommandValidator validator = new();
        ValidationResult result = validator.Validate(new ResetPasswordCommand(token, newPassword));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ResetPasswordCommandValidator_RejectsOverlyLongInputs_AndAcceptsBoundary()
    {
        ResetPasswordCommandValidator validator = new();

        ValidationResult tooLongToken = validator.Validate(new ResetPasswordCommand(new string('a', 513), "ValidPass1!"));
        ValidationResult tooLongPass = validator.Validate(new ResetPasswordCommand("valid-token", new string('a', 129)));
        ValidationResult boundary = validator.Validate(new ResetPasswordCommand(new string('a', 512), new string('a', 128)));
        ValidationResult minBoundary = validator.Validate(new ResetPasswordCommand("valid-token", "12345678"));

        Assert.False(tooLongToken.IsValid);
        Assert.False(tooLongPass.IsValid);
        Assert.True(boundary.IsValid);
        Assert.True(minBoundary.IsValid);
    }

    [Theory]
    [InlineData(null, "ValidPass1!")]
    [InlineData("", "ValidPass1!")]
    [InlineData("   ", "ValidPass1!")]
    [InlineData("OldPass1!", null)]
    [InlineData("OldPass1!", "")]
    [InlineData("OldPass1!", "   ")]
    [InlineData("OldPass1!", "short")]
    public void ChangePasswordCommandValidator_RejectsInvalidPasswords(string? currentPass, string? newPass)
    {
        ChangePasswordCommandValidator validator = new();
        ValidationResult result = validator.Validate(new ChangePasswordCommand(Guid.NewGuid(), currentPass, newPass));
        Assert.False(result.IsValid);
    }

    [Fact]
    public void ChangePasswordCommandValidator_RejectsEmptyUserId()
    {
        ChangePasswordCommandValidator validator = new();
        ValidationResult result = validator.Validate(new ChangePasswordCommand(Guid.Empty, "OldPass1!", "NewPass1!"));
        Assert.False(result.IsValid);
    }

    [Fact]
    public async Task ForgotPasswordHandler_ExistingUser_IssuesToken_InvalidatesPreviousToken_AndEnqueuesEvent()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        CapturingEventQueue eventQueue = new();
        MutableClock clock = new(BaseUtc);
        IOptions<IdentityOptions> options = Options.Create(new IdentityOptions { PasswordResetTokenTtl = TimeSpan.FromHours(1) });

        User user = CreateUser("forgot.user@example.com", "OldPassword@2026!", hasher);
        repo.Users.Add(user);

        ForgotPasswordCommandHandler handler = new(repo, crypto, eventQueue, options, clock);

        // 1. First request generates token 1
        Result result1 = await handler.Handle(new ForgotPasswordCommand("  FORGOT.USER@example.com "), CancellationToken.None);
        Assert.True(result1.IsSuccess);

        PasswordResetRequested event1 = Assert.Single(eventQueue.Events.OfType<PasswordResetRequested>());
        Assert.Equal(user.Id, event1.UserId);
        Assert.False(string.IsNullOrWhiteSpace(event1.RawToken));

        UserToken token1 = Assert.Single(user.Tokens);
        Assert.Equal(UserTokenPurpose.ResetPassword, token1.Purpose);
        Assert.Equal(BaseUtc.AddHours(1), token1.ExpiresAt);
        Assert.Null(token1.ConsumedAt);

        // 2. Second request invalidates token 1 and issues token 2
        clock.UtcNow = BaseUtc.AddMinutes(5);
        Result result2 = await handler.Handle(new ForgotPasswordCommand("forgot.user@example.com"), CancellationToken.None);
        Assert.True(result2.IsSuccess);

        Assert.Equal(2, eventQueue.Events.Count);
        PasswordResetRequested event2 = eventQueue.Events.OfType<PasswordResetRequested>().Last();
        Assert.NotEqual(event1.RawToken, event2.RawToken);
        Assert.NotEqual(event1.TokenId, event2.TokenId);

        // Token 1 is now invalidated (ConsumedAt is set)
        Assert.NotNull(token1.ConsumedAt);
        Assert.Equal(clock.UtcNow, token1.ConsumedAt);

        // Token 2 is active
        UserToken token2 = user.Tokens.Single(t => t.Id == event2.TokenId);
        Assert.Null(token2.ConsumedAt);
    }

    [Fact]
    public async Task ForgotPasswordHandler_UnknownEmailOrLockedAccount_ReturnsSuccessWithoutEmittingEvents()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        CapturingEventQueue eventQueue = new();
        MutableClock clock = new(BaseUtc);
        IOptions<IdentityOptions> options = Options.Create(new IdentityOptions { PasswordResetTokenTtl = TimeSpan.FromHours(1) });

        User lockedUser = CreateUser("locked@example.com", "Password@2026!", hasher);
        Assert.True(lockedUser.Lock(
            isPermanent: false,
            lockedUntil: BaseUtc.AddDays(1),
            reason: "Vi phạm",
            sanctionId: UuidV7.NewGuid(BaseUtc),
            utcNow: BaseUtc).IsSuccess);
        repo.Users.Add(lockedUser);

        ForgotPasswordCommandHandler handler = new(repo, crypto, eventQueue, options, clock);

        // Unknown email -> 204 Success, no event
        Result unknown = await handler.Handle(new ForgotPasswordCommand("nobody@example.com"), CancellationToken.None);
        Assert.True(unknown.IsSuccess);
        Assert.Empty(eventQueue.Events);

        // Locked user -> 204 Success, no event
        Result locked = await handler.Handle(new ForgotPasswordCommand("locked@example.com"), CancellationToken.None);
        Assert.True(locked.IsSuccess);
        Assert.Empty(eventQueue.Events);
        Assert.Empty(lockedUser.Tokens);
    }

    [Fact]
    public async Task ResetPasswordHandler_ValidToken_UpdatesPassword_RevokesAllSessions_AndRejectsReplay()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("reset.me@example.com", "OldPassword@2026!", hasher);
        string rawToken = crypto.GenerateOpaqueToken();
        byte[] tokenHash = crypto.HashToken(rawToken);
        Guid tokenId = UuidV7.NewGuid(BaseUtc);
        user.IssueToken(tokenId, UserTokenPurpose.ResetPassword, tokenHash, BaseUtc.AddHours(1), BaseUtc);

        // Add 2 active refresh sessions
        user.IssueRefreshSession(UuidV7.NewGuid(BaseUtc), crypto.HashToken("s1"), BaseUtc.AddDays(14), BaseUtc);
        user.IssueRefreshSession(UuidV7.NewGuid(BaseUtc), crypto.HashToken("s2"), BaseUtc.AddDays(14), BaseUtc);
        repo.Users.Add(user);

        ResetPasswordCommandHandler handler = new(repo, hasher, crypto, clock);

        // 1. Reset password with valid token
        Result result = await handler.Handle(
            new ResetPasswordCommand(rawToken, "BrandNewPassword@2026!"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(hasher.Verify("BrandNewPassword@2026!", user.PasswordHash!));
        Assert.False(hasher.Verify("OldPassword@2026!", user.PasswordHash!));

        // All refresh sessions revoked
        Assert.All(user.RefreshSessions, s => Assert.Equal(SessionRevokeReason.LogoutAll, s.RevokeReason));
        Assert.Equal(1, repo.RevokeAllCalls);

        // Token consumed
        UserToken token = Assert.Single(user.Tokens);
        Assert.NotNull(token.ConsumedAt);

        // 2. Replay same token fails with TOKEN_INVALID_OR_EXPIRED
        Result replay = await handler.Handle(
            new ResetPasswordCommand(rawToken, "AnotherPassword@2026!"),
            CancellationToken.None);

        Assert.True(replay.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, replay.Error.Code);
    }

    [Fact]
    public async Task ResetPasswordHandler_ExpiredOrInvalidToken_ReturnsTokenInvalidOrExpired()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("expired.token@example.com", "Password@2026!", hasher);
        string rawToken = crypto.GenerateOpaqueToken();
        byte[] tokenHash = crypto.HashToken(rawToken);
        Guid tokenId = UuidV7.NewGuid(BaseUtc);
        user.IssueToken(tokenId, UserTokenPurpose.ResetPassword, tokenHash, BaseUtc.AddMinutes(10), BaseUtc);
        repo.Users.Add(user);

        // Advance clock past expiration
        clock.UtcNow = BaseUtc.AddMinutes(11);

        ResetPasswordCommandHandler handler = new(repo, hasher, crypto, clock);

        Result result = await handler.Handle(
            new ResetPasswordCommand(rawToken, "NewPass@2026!"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, result.Error.Code);

        Result bogus = await handler.Handle(
            new ResetPasswordCommand("totally-bogus-token", "NewPass@2026!"),
            CancellationToken.None);

        Assert.True(bogus.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, bogus.Error.Code);
    }

    [Fact]
    public async Task ChangePasswordHandler_ValidCurrentPassword_UpdatesHashAndRevokesAllSessions()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("change.me@example.com", "OldPassword@2026!", hasher);
        Sha256TokenCryptoService crypto = new();
        user.IssueRefreshSession(UuidV7.NewGuid(BaseUtc), crypto.HashToken("s1"), BaseUtc.AddDays(14), BaseUtc);
        repo.Users.Add(user);

        ChangePasswordCommandHandler handler = new(repo, hasher, clock);

        Result result = await handler.Handle(
            new ChangePasswordCommand(user.Id, "OldPassword@2026!", "ChangedPassword@2026!"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(hasher.Verify("ChangedPassword@2026!", user.PasswordHash!));
        Assert.False(hasher.Verify("OldPassword@2026!", user.PasswordHash!));
        Assert.Equal(1, repo.RevokeAllCalls);
    }

    [Fact]
    public async Task ChangePasswordHandler_WrongCurrentPassword_ReturnsInvalidCredentials()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("change.wrong@example.com", "OldPassword@2026!", hasher);
        repo.Users.Add(user);

        ChangePasswordCommandHandler handler = new(repo, hasher, clock);

        Result result = await handler.Handle(
            new ChangePasswordCommand(user.Id, "WrongCurrentPassword@2026!", "ChangedPassword@2026!"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.InvalidCredentials, result.Error.Code);
        Assert.True(hasher.Verify("OldPassword@2026!", user.PasswordHash!));
        Assert.Equal(0, repo.RevokeAllCalls);
    }

    [Fact]
    public async Task ChangePasswordHandler_LockedAccount_ReturnsAccountLocked()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("change.locked@example.com", "OldPassword@2026!", hasher);
        Assert.True(user.Lock(
            isPermanent: false,
            lockedUntil: BaseUtc.AddHours(5),
            reason: "Khóa kiểm tra",
            sanctionId: UuidV7.NewGuid(BaseUtc),
            utcNow: BaseUtc).IsSuccess);
        repo.Users.Add(user);

        ChangePasswordCommandHandler handler = new(repo, hasher, clock);

        Result result = await handler.Handle(
            new ChangePasswordCommand(user.Id, "OldPassword@2026!", "ChangedPassword@2026!"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.AccountLocked, result.Error.Code);
    }

    [Fact]
    public async Task GetMeHandler_ReturnsProfileSummaryAndStatus_AndNotFoundForUnknownUser()
    {
        FakePasswordAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("me.user@example.com", "Password@2026!", hasher);
        repo.Users.Add(user);
        repo.AdminUserIds.Add(user.Id);

        GetMeQueryHandler handler = new(repo, clock);

        Result<CurrentUserDto> result = await handler.Handle(new GetMeQuery(user.Id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(user.Id, result.Value.Id);
        Assert.Equal("me.user@example.com", result.Value.Email);
        Assert.True(result.Value.EmailVerified);
        Assert.True(result.Value.IsAdmin);
        Assert.Equal("ACTIVE", result.Value.AccountStatus);

        Result<CurrentUserDto> unknown = await handler.Handle(new GetMeQuery(Guid.NewGuid()), CancellationToken.None);
        Assert.True(unknown.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, unknown.Error.Code);
    }

    private static User CreateUser(string email, string password, IPasswordHasher hasher)
    {
        EmailAddress addr = EmailAddress.Create(email).Value;
        User user = User.CreateWithPassword(
            UuidV7.NewGuid(BaseUtc),
            addr,
            hasher.Hash(password),
            BaseUtc,
            markEmailVerified: true).Value;
        user.ClearDomainEvents();
        return user;
    }

    private sealed class MutableClock(DateTimeOffset initialUtc) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = initialUtc;
    }

    private sealed class CapturingEventQueue : IPostCommitEventQueue
    {
        public List<IntegrationEvent> Events { get; } = [];

        public void Enqueue(IntegrationEvent integrationEvent) => Events.Add(integrationEvent);
    }

    private sealed class FakePasswordAuthRepository : IIdentityAuthRepository
    {
        public List<User> Users { get; } = [];
        public HashSet<Guid> AdminUserIds { get; } = [];
        public int RevokeAllCalls { get; private set; }

        public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default)
            => Task.FromResult(Users.Any(u => u.Email == normalizedEmail));

        public Task<Result> AddUserAndSaveAsync(User user, CancellationToken ct = default)
        {
            Users.Add(user);
            return Task.FromResult(Result.Success());
        }

        public Task<Guid?> TryConsumeUserTokenAsync(
            UserTokenPurpose purpose,
            byte[] tokenHash,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            foreach (User user in Users)
            {
                foreach (UserToken token in user.Tokens)
                {
                    if (token.Purpose == purpose
                        && token.ConsumedAt is null
                        && token.ExpiresAt > utcNow
                        && token.TokenHash.AsSpan().SequenceEqual(tokenHash))
                    {
                        token.Consume(utcNow);
                        return Task.FromResult<Guid?>(user.Id);
                    }
                }
            }

            return Task.FromResult<Guid?>(null);
        }

        public Task<User?> FindUserByIdAsync(Guid userId, CancellationToken ct = default)
            => Task.FromResult(Users.FirstOrDefault(u => u.Id == userId));

        public Task<User?> FindUserByEmailAsync(string normalizedEmail, CancellationToken ct = default)
            => Task.FromResult(Users.FirstOrDefault(u => u.Email == normalizedEmail));

        public Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct = default)
            => Task.FromResult(AdminUserIds.Contains(userId));

        public Task<Result> SaveUserAsync(User user, CancellationToken ct = default)
            => Task.FromResult(Result.Success());

        public Task<RefreshSession?> FindSessionByTokenHashAsync(byte[] tokenHash, CancellationToken ct = default)
            => Task.FromResult(
                Users.SelectMany(u => u.RefreshSessions).FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(tokenHash)));

        public Task<bool> TryRotateSessionAsync(
            byte[] oldTokenHash,
            byte[] newTokenHash,
            DateTimeOffset newExpiresAt,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
            => Task.FromResult(false);

        public Task<bool> RevokeSessionByTokenHashAsync(
            byte[] tokenHash,
            SessionRevokeReason reason,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
            => Task.FromResult(false);

        public Task<int> RevokeAllUserSessionsAsync(
            Guid userId,
            SessionRevokeReason reason,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            RevokeAllCalls++;
            User? user = Users.FirstOrDefault(u => u.Id == userId);
            return Task.FromResult(user?.RevokeAllActiveSessions(reason, utcNow) ?? 0);
        }

        public Task<IReadOnlyList<RefreshSession>> GetActiveSessionsForUserAsync(
            Guid userId,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<RefreshSession>>([]);

        public Task<RefreshSession?> FindSessionByIdAsync(Guid sessionId, CancellationToken ct = default)
            => Task.FromResult<RefreshSession?>(null);

        public Task<bool> RevokeSessionByIdAsync(
            Guid sessionId,
            Guid userId,
            SessionRevokeReason reason,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
            => Task.FromResult(false);

        public Task InvalidateUserTokensAsync(
            Guid userId,
            UserTokenPurpose purpose,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            User? user = Users.FirstOrDefault(u => u.Id == userId);
            user?.InvalidateTokens(purpose, utcNow);
            return Task.CompletedTask;
        }
    }
}
