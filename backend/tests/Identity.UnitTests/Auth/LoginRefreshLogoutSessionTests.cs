using System.IdentityModel.Tokens.Jwt;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Commands.Login;
using BrainMemo.Identity.Application.Auth.Commands.Logout;
using BrainMemo.Identity.Application.Auth.Commands.LogoutAll;
using BrainMemo.Identity.Application.Auth.Commands.Refresh;
using BrainMemo.Identity.Application.Auth.Commands.RevokeSession;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Application.Auth.Queries.ListSessions;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.Identity.Infrastructure.Security;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Xunit;

namespace Identity.UnitTests.Auth;

public sealed class LoginRefreshLogoutSessionTests
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Commands_And_Queries_ToString_RedactSecrets()
    {
        LoginCommand login = new("learner@example.com", "SuperSecret123!", "Mozilla/5.0", "127.0.0.1");
        RefreshTokenCommand refresh = new("raw-refresh-token-secret", "Mozilla/5.0", "127.0.0.1");
        LogoutCommand logout = new("raw-refresh-token-secret");
        RevokeSessionCommand revoke = new(Guid.NewGuid(), Guid.NewGuid(), "raw-refresh-token-secret");
        ListSessionsQuery listSessions = new(Guid.NewGuid(), "raw-refresh-token-secret");

        Assert.DoesNotContain("learner@example.com", login.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("SuperSecret123!", login.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", login.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("raw-refresh-token-secret", refresh.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", refresh.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("raw-refresh-token-secret", logout.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", logout.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("raw-refresh-token-secret", revoke.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", revoke.ToString(), StringComparison.Ordinal);

        Assert.DoesNotContain("raw-refresh-token-secret", listSessions.ToString(), StringComparison.Ordinal);
        Assert.Contains("REDACTED", listSessions.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null, "ValidPass1!")]
    [InlineData("", "ValidPass1!")]
    [InlineData("   ", "ValidPass1!")]
    [InlineData("not-an-email", "ValidPass1!")]
    [InlineData("user@example.com", null)]
    [InlineData("user@example.com", "")]
    [InlineData("user@example.com", "       ")]
    [InlineData("user@example.com", "1234567")]
    public void LoginCommandValidator_RejectsInvalidInputs(string? email, string? password)
    {
        LoginCommandValidator validator = new();

        ValidationResult result = validator.Validate(new LoginCommand(email, password));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void LoginCommandValidator_AcceptsBoundaryLengths_AndRejectsTooLongPassword()
    {
        LoginCommandValidator validator = new();

        Assert.True(validator.Validate(new LoginCommand("user@example.com", "12345678")).IsValid);
        Assert.True(validator.Validate(new LoginCommand("user@example.com", new string('x', 128))).IsValid);
        Assert.False(validator.Validate(new LoginCommand("user@example.com", new string('x', 129))).IsValid);
    }

    [Fact]
    public async Task LoginHandler_ValidCredentials_ReturnsJwt30Min_AndCreates14DayHashedRefreshSession()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("alice@example.com", "Password@2026!", hasher, verified: true);
        repo.Users.Add(user);
        repo.AdminUserIds.Add(user.Id);

        LoginCommandHandler handler = new(repo, hasher, crypto, jwtGen, jwtOptions, clock);

        Result<AuthTokensResult> result = await handler.Handle(
            new LoginCommand("  ALICE@Example.com ", "Password@2026!", "TestAgent/1.0", "10.0.0.5"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1800, result.Value.ExpiresIn);
        Assert.Equal(BaseUtc.AddDays(14), result.Value.ExpiresAt);
        Assert.False(string.IsNullOrWhiteSpace(result.Value.RawRefreshToken));
        Assert.False(string.IsNullOrWhiteSpace(result.Value.AccessToken));

        Assert.Equal(user.Id, result.Value.User.Id);
        Assert.Equal("alice@example.com", result.Value.User.Email);
        Assert.True(result.Value.User.EmailVerified);
        Assert.True(result.Value.User.IsAdmin);
        Assert.Equal("ACTIVE", result.Value.User.AccountStatus);

        RefreshSession session = Assert.Single(user.RefreshSessions);
        Assert.Equal(crypto.HashToken(result.Value.RawRefreshToken), session.TokenHash);
        Assert.Equal(BaseUtc.AddDays(14), session.ExpiresAt);
        Assert.Equal("TestAgent/1.0", session.UserAgent);
        Assert.Equal("10.0.0.5", session.IpAddress);

        JwtSecurityToken parsedJwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Value.AccessToken);
        Assert.Equal(user.Id.ToString(), parsedJwt.Claims.Single(c => c.Type == "sub").Value);
        Assert.Equal("ADMIN", parsedJwt.Claims.Single(c => c.Type == "role").Value);
        Assert.Equal("ACTIVE", parsedJwt.Claims.Single(c => c.Type == "account_status").Value);
    }

    [Fact]
    public async Task LoginHandler_UnknownEmailOrWrongPassword_ReturnsInvalidCredentials()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("alice@example.com", "Password@2026!", hasher, verified: true);
        repo.Users.Add(user);

        LoginCommandHandler handler = new(repo, hasher, crypto, jwtGen, jwtOptions, clock);

        Result<AuthTokensResult> unknownUser = await handler.Handle(
            new LoginCommand("nobody@example.com", "Password@2026!"),
            CancellationToken.None);

        Assert.True(unknownUser.IsFailure);
        Assert.Equal(ErrorCodes.InvalidCredentials, unknownUser.Error.Code);

        Result<AuthTokensResult> wrongPass = await handler.Handle(
            new LoginCommand("alice@example.com", "WrongPassword@2026!"),
            CancellationToken.None);

        Assert.True(wrongPass.IsFailure);
        Assert.Equal(ErrorCodes.InvalidCredentials, wrongPass.Error.Code);
        Assert.Empty(user.RefreshSessions);
    }

    [Fact]
    public async Task LoginHandler_LockedAccount_ReturnsAccountLockedWithMetadata_AndRevokesSessions()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("locked@example.com", "Password@2026!", hasher, verified: true);
        DateTimeOffset lockedUntil = BaseUtc.AddDays(3);
        Assert.True(user.Lock(
            isPermanent: false,
            lockedUntil: lockedUntil,
            reason: "Vi phạm quy định cộng đồng",
            sanctionId: UuidV7.NewGuid(BaseUtc),
            utcNow: BaseUtc).IsSuccess);
        repo.Users.Add(user);

        LoginCommandHandler handler = new(repo, hasher, crypto, jwtGen, jwtOptions, clock);

        Result<AuthTokensResult> result = await handler.Handle(
            new LoginCommand("locked@example.com", "Password@2026!"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.AccountLocked, result.Error.Code);
        Assert.NotNull(result.Error.Metadata);
        Assert.Equal(lockedUntil, result.Error.Metadata!["lockedUntil"]);
        Assert.Equal("Vi phạm quy định cộng đồng", result.Error.Metadata!["lockReason"]);
        Assert.Equal(1, repo.RevokeAllCalls);
    }

    [Fact]
    public async Task LoginHandler_ExpiredTemporaryLock_AutoUnlocks_EnqueuesEvent_AndSucceeds()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);
        CapturingEventQueue eventQueue = new();

        User user = CreateUser("expiredlock@example.com", "Password@2026!", hasher, verified: true);
        Guid sanctionId = UuidV7.NewGuid(BaseUtc);
        Assert.True(user.Lock(
            isPermanent: false,
            lockedUntil: BaseUtc.AddMinutes(10),
            reason: "Tạm khóa 10 phút",
            sanctionId: sanctionId,
            utcNow: BaseUtc).IsSuccess);
        repo.Users.Add(user);

        // Advance clock past lockedUntil
        clock.UtcNow = BaseUtc.AddMinutes(11);

        LoginCommandHandler handler = new(repo, hasher, crypto, jwtGen, jwtOptions, clock, eventQueue);

        Result<AuthTokensResult> result = await handler.Handle(
            new LoginCommand("expiredlock@example.com", "Password@2026!"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(AccountStatus.Active, user.AccountStatus);
        Assert.Null(user.LockedUntil);
        Assert.Null(user.LockReason);

        AccountUnlocked unlockedEvent = Assert.Single(eventQueue.Events.OfType<AccountUnlocked>());
        Assert.Equal(user.Id, unlockedEvent.UserId);
        Assert.Equal(sanctionId, unlockedEvent.SanctionId);
        Assert.Equal(UnlockKind.AutoExpired, unlockedEvent.Kind);
    }

    [Fact]
    public async Task RefreshTokenHandler_ValidSession_RotatesAndReturnsNewTokens_SecondConcurrentCallFails()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("refresh@example.com", "Password@2026!", hasher, verified: true);
        string initialRawToken = crypto.GenerateOpaqueToken();
        byte[] initialHash = crypto.HashToken(initialRawToken);
        Result<RefreshSession> sessionRes = user.IssueRefreshSession(
            UuidV7.NewGuid(BaseUtc),
            initialHash,
            BaseUtc.AddDays(14),
            BaseUtc,
            "Browser/1.0",
            "127.0.0.1");
        Assert.True(sessionRes.IsSuccess);
        repo.Users.Add(user);

        clock.UtcNow = BaseUtc.AddHours(1);
        RefreshTokenCommandHandler handler = new(repo, crypto, jwtGen, jwtOptions, clock);

        Result<AuthTokensResult> firstRefresh = await handler.Handle(
            new RefreshTokenCommand(initialRawToken, "Browser/1.0", "127.0.0.1"),
            CancellationToken.None);

        Assert.True(firstRefresh.IsSuccess);
        Assert.NotEqual(initialRawToken, firstRefresh.Value.RawRefreshToken);
        Assert.Equal(crypto.HashToken(firstRefresh.Value.RawRefreshToken), sessionRes.Value.TokenHash);

        // Reusing the old token fails with UNAUTHENTICATED
        Result<AuthTokensResult> replayOld = await handler.Handle(
            new RefreshTokenCommand(initialRawToken, "Browser/1.0", "127.0.0.1"),
            CancellationToken.None);

        Assert.True(replayOld.IsFailure);
        Assert.Equal(ErrorCodes.Unauthenticated, replayOld.Error.Code);

        // Simulated race loss (TryRotateSessionAsync returns false)
        repo.ForceRotateFailure = true;
        Result<AuthTokensResult> raceLoss = await handler.Handle(
            new RefreshTokenCommand(firstRefresh.Value.RawRefreshToken, "Browser/1.0", "127.0.0.1"),
            CancellationToken.None);

        Assert.True(raceLoss.IsFailure);
        Assert.Equal(ErrorCodes.Unauthenticated, raceLoss.Error.Code);
    }

    [Fact]
    public async Task Logout_LogoutAll_ListSessions_And_RevokeSession_BehaveAsSpecified()
    {
        FakeAuthRepository repo = new();
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("sessions@example.com", "Password@2026!", hasher, verified: true);
        string raw1 = crypto.GenerateOpaqueToken();
        string raw2 = crypto.GenerateOpaqueToken();

        RefreshSession s1 = user.IssueRefreshSession(
            UuidV7.NewGuid(BaseUtc),
            crypto.HashToken(raw1),
            BaseUtc.AddDays(14),
            BaseUtc,
            "Chrome",
            "10.0.0.1").Value;

        RefreshSession s2 = user.IssueRefreshSession(
            UuidV7.NewGuid(BaseUtc.AddMinutes(1)),
            crypto.HashToken(raw2),
            BaseUtc.AddDays(14),
            BaseUtc.AddMinutes(1),
            "Firefox",
            "10.0.0.2").Value;

        repo.Users.Add(user);

        // 1. ListSessions marks s1 as current when raw1 is passed
        ListSessionsQueryHandler listHandler = new(repo, crypto, clock);
        Result<IReadOnlyList<SessionDto>> listResult = await listHandler.Handle(
            new ListSessionsQuery(user.Id, raw1),
            CancellationToken.None);

        Assert.True(listResult.IsSuccess);
        Assert.Equal(2, listResult.Value.Count);
        Assert.True(listResult.Value.Single(x => x.Id == s1.Id).IsCurrent);
        Assert.False(listResult.Value.Single(x => x.Id == s2.Id).IsCurrent);

        // 2. RevokeSession for another user returns NotFound
        RevokeSessionCommandHandler revokeHandler = new(repo, crypto, clock);
        Result<RevokeSessionResult> otherUserAttempt = await revokeHandler.Handle(
            new RevokeSessionCommand(s1.Id, Guid.NewGuid(), raw1),
            CancellationToken.None);

        Assert.True(otherUserAttempt.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, otherUserAttempt.Error.Code);

        // 3. RevokeSession on current session sets WasCurrent = true
        Result<RevokeSessionResult> revokeCurrent = await revokeHandler.Handle(
            new RevokeSessionCommand(s1.Id, user.Id, raw1),
            CancellationToken.None);

        Assert.True(revokeCurrent.IsSuccess);
        Assert.True(revokeCurrent.Value.WasCurrent);
        Assert.Equal(SessionRevokeReason.UserRevoked, s1.RevokeReason);

        // 4. Logout with missing token is idempotent
        LogoutCommandHandler logoutHandler = new(repo, crypto, clock);
        Assert.True((await logoutHandler.Handle(new LogoutCommand(null), CancellationToken.None)).IsSuccess);

        // 5. LogoutAll revokes remaining active sessions with LogoutAll reason
        LogoutAllCommandHandler logoutAllHandler = new(repo, clock);
        Assert.True((await logoutAllHandler.Handle(new LogoutAllCommand(user.Id), CancellationToken.None)).IsSuccess);
        Assert.Equal(SessionRevokeReason.LogoutAll, s2.RevokeReason);
    }

    [Fact]
    public async Task IdentityAuthRepository_InMemoryDbContext_PersistsRotatesAndRevokesRefreshSessions()
    {
        DbContextOptions<IdentityDbContext> dbOptions = new DbContextOptionsBuilder<IdentityDbContext>()
            .UseInMemoryDatabase($"idn_auth_repo_{Guid.NewGuid():N}")
            .Options;

        await using IdentityDbContext db = new(dbOptions);
        IdentityAuthRepository repo = new(db);
        BCryptPasswordHasher hasher = new();
        Sha256TokenCryptoService crypto = new();
        IOptions<IdentityJwtOptions> jwtOptions = CreateJwtOptions();
        JwtTokenGenerator jwtGen = new(jwtOptions, new FakeHostEnvironment("Testing"));
        MutableClock clock = new(BaseUtc);

        User user = CreateUser("repo.user@example.com", "Password@2026!", hasher, verified: true);
        Assert.True((await repo.AddUserAndSaveAsync(user)).IsSuccess);

        LoginCommandHandler loginHandler = new(repo, hasher, crypto, jwtGen, jwtOptions, clock);
        Result<AuthTokensResult> login1 = await loginHandler.Handle(
            new LoginCommand("repo.user@example.com", "Password@2026!", "Browser1", "10.0.0.1"),
            CancellationToken.None);
        Assert.True(login1.IsSuccess);

        clock.UtcNow = BaseUtc.AddMinutes(5);
        RefreshTokenCommandHandler refreshHandler = new(repo, crypto, jwtGen, jwtOptions, clock);
        Result<AuthTokensResult> refreshed = await refreshHandler.Handle(
            new RefreshTokenCommand(login1.Value.RawRefreshToken, "Browser1", "10.0.0.1"),
            CancellationToken.None);
        Assert.True(refreshed.IsSuccess);
        Assert.NotEqual(login1.Value.RawRefreshToken, refreshed.Value.RawRefreshToken);

        // Old token is rejected
        Result<AuthTokensResult> oldAttempt = await refreshHandler.Handle(
            new RefreshTokenCommand(login1.Value.RawRefreshToken, "Browser1", "10.0.0.1"),
            CancellationToken.None);
        Assert.True(oldAttempt.IsFailure);
        Assert.Equal(ErrorCodes.Unauthenticated, oldAttempt.Error.Code);

        // Second login creates a 2nd active session
        Result<AuthTokensResult> login2 = await loginHandler.Handle(
            new LoginCommand("repo.user@example.com", "Password@2026!", "Browser2", "10.0.0.2"),
            CancellationToken.None);
        Assert.True(login2.IsSuccess);

        IReadOnlyList<RefreshSession> activeSessions = await repo.GetActiveSessionsForUserAsync(user.Id, clock.UtcNow);
        Assert.Equal(2, activeSessions.Count);

        // Revoke one session by Id
        RefreshSession target = activeSessions[0];
        Assert.True(await repo.RevokeSessionByIdAsync(target.Id, user.Id, SessionRevokeReason.UserRevoked, clock.UtcNow));

        IReadOnlyList<RefreshSession> remaining = await repo.GetActiveSessionsForUserAsync(user.Id, clock.UtcNow);
        Assert.Single(remaining);

        // Revoke all
        int revokedCount = await repo.RevokeAllUserSessionsAsync(user.Id, SessionRevokeReason.LogoutAll, clock.UtcNow);
        Assert.Equal(1, revokedCount);
        Assert.Empty(await repo.GetActiveSessionsForUserAsync(user.Id, clock.UtcNow));
    }

    private static User CreateUser(string email, string password, IPasswordHasher hasher, bool verified)
    {
        EmailAddress addr = EmailAddress.Create(email).Value;
        User user = User.CreateWithPassword(
            UuidV7.NewGuid(BaseUtc),
            addr,
            hasher.Hash(password),
            BaseUtc,
            markEmailVerified: verified).Value;
        user.ClearDomainEvents();
        return user;
    }

    private static IOptions<IdentityJwtOptions> CreateJwtOptions()
        => Options.Create(new IdentityJwtOptions
        {
            Issuer = "brainmemo-api",
            Audience = "brainmemo-client",
            SigningKey = "brainmemo-unit-test-jwt-signing-key-32bytes!",
            AccessTokenMinutes = 30,
            RefreshTokenDays = 14,
        });

    private sealed class MutableClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
    }

    private sealed class CapturingEventQueue : IPostCommitEventQueue
    {
        public List<IntegrationEvent> Events { get; } = [];

        public void Enqueue(IntegrationEvent integrationEvent) => Events.Add(integrationEvent);
    }

    private sealed class FakeHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "BrainMemo.WebApi";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class FakeAuthRepository : IIdentityAuthRepository
    {
        public List<User> Users { get; } = [];
        public HashSet<Guid> AdminUserIds { get; } = [];
        public int RevokeAllCalls { get; private set; }
        public bool ForceRotateFailure { get; set; }

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
            => Task.FromResult<Guid?>(null);

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
                Users
                    .SelectMany(u => u.RefreshSessions)
                    .FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(tokenHash)));

        public Task<bool> TryRotateSessionAsync(
            byte[] oldTokenHash,
            byte[] newTokenHash,
            DateTimeOffset newExpiresAt,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            if (ForceRotateFailure)
            {
                return Task.FromResult(false);
            }

            RefreshSession? session = Users
                .SelectMany(u => u.RefreshSessions)
                .FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(oldTokenHash));

            if (session is null || !session.IsActive(utcNow))
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(session.Rotate(newTokenHash, newExpiresAt, utcNow).IsSuccess);
        }

        public Task<bool> RevokeSessionByTokenHashAsync(
            byte[] tokenHash,
            SessionRevokeReason reason,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            RefreshSession? session = Users
                .SelectMany(u => u.RefreshSessions)
                .FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(tokenHash) && s.RevokedAt is null);

            if (session is null)
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(session.Revoke(reason, utcNow).IsSuccess);
        }

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
        {
            User? user = Users.FirstOrDefault(u => u.Id == userId);
            if (user is null)
            {
                return Task.FromResult<IReadOnlyList<RefreshSession>>([]);
            }

            IReadOnlyList<RefreshSession> active = user.RefreshSessions
                .Where(s => s.IsActive(utcNow))
                .OrderByDescending(s => s.LastUsedAt)
                .ToList();
            return Task.FromResult(active);
        }

        public Task<RefreshSession?> FindSessionByIdAsync(Guid sessionId, CancellationToken ct = default)
            => Task.FromResult(
                Users
                    .SelectMany(u => u.RefreshSessions)
                    .FirstOrDefault(s => s.Id == sessionId));

        public Task<bool> RevokeSessionByIdAsync(
            Guid sessionId,
            Guid userId,
            SessionRevokeReason reason,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            RefreshSession? session = Users
                .Where(u => u.Id == userId)
                .SelectMany(u => u.RefreshSessions)
                .FirstOrDefault(s => s.Id == sessionId && s.RevokedAt is null);

            if (session is null)
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(session.Revoke(reason, utcNow).IsSuccess);
        }
    }
}
