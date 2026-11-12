using System.Text;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.BuildingBlocks.Infrastructure;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Commands.Register;
using BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;
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
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;

namespace Identity.UnitTests.Auth;

public sealed class RegisterAndVerifyEmailTests
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Commands_ToString_RedactSecrets()
    {
        RegisterCommand register = new("user@example.com", "SuperSecret123!");
        VerifyEmailCommand verify = new("raw-secret-token-value");

        string registerString = register.ToString();
        string verifyString = verify.ToString();

        Assert.DoesNotContain("user@example.com", registerString, StringComparison.Ordinal);
        Assert.DoesNotContain("SuperSecret123!", registerString, StringComparison.Ordinal);
        Assert.Contains("REDACTED", registerString, StringComparison.Ordinal);

        Assert.DoesNotContain("raw-secret-token-value", verifyString, StringComparison.Ordinal);
        Assert.Contains("REDACTED", verifyString, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("", "ValidPass1!")]
    [InlineData("   ", "ValidPass1!")]
    [InlineData("not-an-email", "ValidPass1!")]
    [InlineData("user@example.com", "")]
    [InlineData("user@example.com", "       ")]
    [InlineData("user@example.com", "1234567")]
    public void RegisterCommandValidator_RejectsInvalidInputs(string email, string password)
    {
        RegisterCommandValidator validator = new();

        ValidationResult result = validator.Validate(new RegisterCommand(email, password));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void RegisterCommandValidator_RejectsPasswordExceedingMaxLength_AndAcceptsBoundary()
    {
        RegisterCommandValidator validator = new();

        ValidationResult tooLong = validator.Validate(new RegisterCommand("user@example.com", new string('a', 129)));
        ValidationResult boundary = validator.Validate(new RegisterCommand("user@example.com", new string('a', 128)));
        ValidationResult minBoundary = validator.Validate(new RegisterCommand("user@example.com", "12345678"));

        Assert.False(tooLong.IsValid);
        Assert.True(boundary.IsValid);
        Assert.True(minBoundary.IsValid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void VerifyEmailCommandValidator_RejectsBlankTokens(string? token)
    {
        VerifyEmailCommandValidator validator = new();

        ValidationResult result = validator.Validate(new VerifyEmailCommand(token));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void VerifyEmailCommandValidator_RejectsTooLongToken_AndAcceptsTrimmedBoundary()
    {
        VerifyEmailCommandValidator validator = new();

        ValidationResult tooLong = validator.Validate(new VerifyEmailCommand(new string('x', 513)));
        ValidationResult boundary = validator.Validate(new VerifyEmailCommand($"  {new string('x', 512)}  "));

        Assert.False(tooLong.IsValid);
        Assert.True(boundary.IsValid);
    }

    [Fact]
    public async Task RegisterHandler_CreatesUnverifiedUser_HashesSecret_AndEnqueuesPostCommitEvents()
    {
        InMemoryAuthRepository repo = new();
        BCryptPasswordHasher passwordHasher = new();
        Sha256TokenCryptoService tokenCrypto = new();
        CapturingEventQueue eventQueue = new();
        FixedClock clock = new(BaseUtc);
        TimeSpan ttl = TimeSpan.FromMinutes(30);
        IOptions<IdentityOptions> options = Options.Create(new IdentityOptions { EmailVerificationTokenTtl = ttl });

        RegisterCommandHandler handler = new(repo, passwordHasher, tokenCrypto, eventQueue, options, clock);

        Result result = await handler.Handle(
            new RegisterCommand("  Alice.User+Tag@Example.COM  ", "Password@2026!"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, repo.AddCallCount);

        User saved = Assert.Single(repo.Users);
        Assert.Equal("alice.user+tag@example.com", saved.Email);
        Assert.Null(saved.EmailVerifiedAt);
        Assert.NotNull(saved.PasswordHash);
        Assert.NotEqual("Password@2026!", saved.PasswordHash);
        Assert.True(passwordHasher.Verify("Password@2026!", saved.PasswordHash!));
        Assert.Empty(saved.DomainEvents);

        UserToken token = Assert.Single(saved.Tokens);
        Assert.Equal(UserTokenPurpose.VerifyEmail, token.Purpose);
        Assert.Equal(BaseUtc.Add(ttl), token.ExpiresAt);
        Assert.Null(token.ConsumedAt);

        Assert.Equal(2, eventQueue.Events.Count);
        UserRegistered registeredEvent = Assert.IsType<UserRegistered>(eventQueue.Events[0]);
        EmailVerificationRequested verificationEvent = Assert.IsType<EmailVerificationRequested>(eventQueue.Events[1]);

        Assert.Equal(saved.Id, registeredEvent.UserId);
        Assert.Equal(saved.Id, verificationEvent.UserId);
        Assert.Equal(token.Id, verificationEvent.TokenId);
        Assert.False(string.IsNullOrWhiteSpace(verificationEvent.RawToken));
        Assert.NotEqual(Encoding.UTF8.GetBytes(verificationEvent.RawToken), token.TokenHash);
        Assert.Equal(tokenCrypto.HashToken(verificationEvent.RawToken), token.TokenHash);
    }

    [Fact]
    public async Task RegisterHandler_DuplicatePreCheck_ReturnsEmailTakenAndEnqueuesNoEvents()
    {
        InMemoryAuthRepository repo = new() { EmailExistsOverride = true };
        CapturingEventQueue eventQueue = new();
        RegisterCommandHandler handler = new(
            repo,
            new BCryptPasswordHasher(),
            new Sha256TokenCryptoService(),
            eventQueue,
            Options.Create(new IdentityOptions()),
            new FixedClock(BaseUtc));

        Result result = await handler.Handle(new RegisterCommand("dup@example.com", "Password@2026!"), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.EmailTaken, result.Error.Code);
        Assert.Equal(0, repo.AddCallCount);
        Assert.Empty(eventQueue.Events);
    }

    [Fact]
    public async Task RegisterHandler_ConcurrentSaveEmailTaken_ReturnsEmailTakenAndEnqueuesNoEvents()
    {
        InMemoryAuthRepository repo = new()
        {
            AddResultOverride = Error.Conflict(ErrorCodes.EmailTaken, "Duplicate race."),
        };
        CapturingEventQueue eventQueue = new();
        RegisterCommandHandler handler = new(
            repo,
            new BCryptPasswordHasher(),
            new Sha256TokenCryptoService(),
            eventQueue,
            Options.Create(new IdentityOptions()),
            new FixedClock(BaseUtc));

        Result result = await handler.Handle(new RegisterCommand("race@example.com", "Password@2026!"), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.EmailTaken, result.Error.Code);
        Assert.Equal(1, repo.AddCallCount);
        Assert.Empty(eventQueue.Events);
    }

    [Fact]
    public async Task VerifyEmailHandler_ValidToken_TrimsHashesConsumesAndVerifiesUser()
    {
        Sha256TokenCryptoService tokenCrypto = new();
        const string rawToken = "opaque-verify-token-123";
        byte[] expectedHash = tokenCrypto.HashToken(rawToken);

        Guid userId = UuidV7.NewGuid(BaseUtc);
        User user = User.CreateWithPassword(
            userId,
            EmailAddress.Create("verify@example.com").Value,
            "$2a$11$hash",
            BaseUtc,
            markEmailVerified: false).Value;
        Assert.True(user.IssueToken(
            UuidV7.NewGuid(BaseUtc),
            UserTokenPurpose.VerifyEmail,
            expectedHash,
            BaseUtc.AddHours(1),
            BaseUtc).IsSuccess);

        InMemoryAuthRepository repo = new();
        repo.Users.Add(user);

        DateTimeOffset verifyUtc = BaseUtc.AddMinutes(10);
        VerifyEmailCommandHandler handler = new(repo, tokenCrypto, new FixedClock(verifyUtc));

        Result result = await handler.Handle(new VerifyEmailCommand($"  {rawToken}  "), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(verifyUtc, user.EmailVerifiedAt);
        Assert.Equal(verifyUtc, Assert.Single(user.Tokens).ConsumedAt);
    }

    [Fact]
    public async Task VerifyEmailHandler_ExpiredOrConsumedOrMissingToken_ReturnsTokenInvalidOrExpired()
    {
        Sha256TokenCryptoService tokenCrypto = new();
        const string rawToken = "one-time-token";
        byte[] hash = tokenCrypto.HashToken(rawToken);

        User user = User.CreateWithPassword(
            UuidV7.NewGuid(BaseUtc),
            EmailAddress.Create("expired@example.com").Value,
            "$2a$11$hash",
            BaseUtc,
            markEmailVerified: false).Value;
        Assert.True(user.IssueToken(
            UuidV7.NewGuid(BaseUtc),
            UserTokenPurpose.VerifyEmail,
            hash,
            BaseUtc.AddMinutes(5),
            BaseUtc).IsSuccess);

        InMemoryAuthRepository repo = new();
        repo.Users.Add(user);

        // Past expiry
        VerifyEmailCommandHandler expiredHandler = new(repo, tokenCrypto, new FixedClock(BaseUtc.AddMinutes(5)));
        Result expiredResult = await expiredHandler.Handle(new VerifyEmailCommand(rawToken), CancellationToken.None);
        Assert.True(expiredResult.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, expiredResult.Error.Code);
        Assert.Null(user.EmailVerifiedAt);

        // Unknown token
        VerifyEmailCommandHandler validTimeHandler = new(repo, tokenCrypto, new FixedClock(BaseUtc.AddMinutes(1)));
        Result unknownResult = await validTimeHandler.Handle(new VerifyEmailCommand("wrong-token"), CancellationToken.None);
        Assert.True(unknownResult.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, unknownResult.Error.Code);

        // Missing user even if token returned userId
        repo.ForcedConsumeUserId = Guid.NewGuid();
        Result missingUserResult = await validTimeHandler.Handle(new VerifyEmailCommand("any"), CancellationToken.None);
        Assert.True(missingUserResult.IsFailure);
        Assert.Equal(ErrorCodes.TokenInvalidOrExpired, missingUserResult.Error.Code);
    }

    [Fact]
    public async Task MediatRPipeline_InvalidCommands_ShortCircuitWithValidationFailed()
    {
        InMemoryAuthRepository repo = new();
        ServiceCollection services = new();
        services.AddLogging();
        services.AddSingleton<IIdentityAuthRepository>(repo);
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<ITokenCryptoService, Sha256TokenCryptoService>();
        services.AddSingleton<IPostCommitEventQueue, CapturingEventQueue>();
        services.AddSingleton<IUnitOfWork, NoOpUnitOfWork>();
        services.AddSingleton(Options.Create(new IdentityOptions()));
        services.AddSingleton<IClock>(new FixedClock(BaseUtc));
        services.AddBuildingBlocksInfrastructure(typeof(RegisterCommand).Assembly);

        await using ServiceProvider provider = services.BuildServiceProvider();
        using IServiceScope scope = provider.CreateScope();
        ISender sender = scope.ServiceProvider.GetRequiredService<ISender>();

        Result registerFailure = await sender.Send(new RegisterCommand("bad", "123"));
        Result verifyFailure = await sender.Send(new VerifyEmailCommand("   "));

        Assert.True(registerFailure.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, registerFailure.Error.Code);
        Assert.True(verifyFailure.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, verifyFailure.Error.Code);
        Assert.Equal(0, repo.AddCallCount);
    }

    private sealed class FixedClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; } = utcNow;
    }

    private sealed class CapturingEventQueue : IPostCommitEventQueue
    {
        public List<IntegrationEvent> Events { get; } = [];

        public void Enqueue(IntegrationEvent integrationEvent) => Events.Add(integrationEvent);
    }

    private sealed class InMemoryAuthRepository : IIdentityAuthRepository
    {
        public List<User> Users { get; } = [];
        public int AddCallCount { get; private set; }
        public bool? EmailExistsOverride { get; init; }
        public Result? AddResultOverride { get; init; }
        public Guid? ForcedConsumeUserId { get; set; }

        public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default)
            => Task.FromResult(EmailExistsOverride ?? Users.Any(u => u.Email == normalizedEmail));

        public Task<Result> AddUserAndSaveAsync(User user, CancellationToken ct = default)
        {
            AddCallCount++;
            if (AddResultOverride is not null)
            {
                return Task.FromResult(AddResultOverride);
            }

            Users.Add(user);
            return Task.FromResult(Result.Success());
        }

        public Task<Guid?> TryConsumeUserTokenAsync(
            UserTokenPurpose purpose,
            byte[] tokenHash,
            DateTimeOffset utcNow,
            CancellationToken ct = default)
        {
            if (ForcedConsumeUserId.HasValue)
            {
                return Task.FromResult<Guid?>(ForcedConsumeUserId.Value);
            }

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
            => Task.FromResult(false);

        public Task<Result> SaveUserAsync(User user, CancellationToken ct = default)
            => Task.FromResult(Result.Success());

        public Task<RefreshSession?> FindSessionByTokenHashAsync(byte[] tokenHash, CancellationToken ct = default)
            => Task.FromResult(Users.SelectMany(u => u.RefreshSessions).FirstOrDefault(s => s.TokenHash.AsSpan().SequenceEqual(tokenHash)));

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
            => Task.FromResult(0);

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
    }

    private sealed class NoOpUnitOfWork : IUnitOfWork
    {
        public string ModuleName => "Identity";

        public Task<int> SaveChangesAsync(CancellationToken ct = default) => Task.FromResult(0);

        public Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default)
            => Task.FromResult<IUnitOfWorkTransaction>(new NoOpTransaction());

        private sealed class NoOpTransaction : IUnitOfWorkTransaction
        {
            public Task CommitAsync(CancellationToken ct = default) => Task.CompletedTask;

            public Task RollbackAsync(CancellationToken ct = default) => Task.CompletedTask;

            public ValueTask DisposeAsync() => ValueTask.CompletedTask;
        }
    }
}
