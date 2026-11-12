using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Infrastructure.Persistence;
using BrainMemo.Identity.Infrastructure.Security;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Identity.IntegrationTests.Fixtures;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Identity.IntegrationTests.Auth;

[Collection(MySqlCollection.Name)]
public sealed class RegisterAndVerifyEmailEndpointIntegrationTests(MySqlTestDatabaseFixture fixture)
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Register_And_VerifyEmail_EndToEnd_HappyPath_Expired_And_SingleUse()
    {
        await WithTestHostAsync(
            ttl: TimeSpan.FromMinutes(5),
            async (client, clock, recorder, connectionString) =>
            {
                // 1. Register -> 201 Created, user + hashed token persisted, post-commit events fired with visible DB state.
                HttpResponseMessage registerResponse = await client.PostAsJsonAsync(
                    "/api/v1/auth/register",
                    new { email = "  Alice.Learner+1@Example.COM ", password = "Password@2026!" });

                Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

                await using IdentityDbContext dbAfterRegister = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                User user = await dbAfterRegister.Users
                    .Include(u => u.Tokens)
                    .AsNoTracking()
                    .SingleAsync();

                Assert.Equal("alice.learner+1@example.com", user.Email);
                Assert.Null(user.EmailVerifiedAt);
                Assert.NotNull(user.PasswordHash);
                Assert.NotEqual("Password@2026!", user.PasswordHash);
                Assert.True(new BCryptPasswordHasher().Verify("Password@2026!", user.PasswordHash!));

                UserToken tokenRow = Assert.Single(user.Tokens);
                Assert.Equal(UserTokenPurpose.VerifyEmail, tokenRow.Purpose);
                Assert.Equal(BaseUtc.AddMinutes(5), tokenRow.ExpiresAt);
                Assert.Null(tokenRow.ConsumedAt);

                Assert.Equal(2, recorder.Events.Count);
                RecordedEvent registeredRecord = Assert.Single(recorder.Events, static r => r.Event is UserRegistered);
                RecordedEvent verificationRecord = Assert.Single(recorder.Events, static r => r.Event is EmailVerificationRequested);

                Assert.True(registeredRecord.UserVisibleOnFreshConnectionAtPublishTime);
                Assert.True(verificationRecord.UserVisibleOnFreshConnectionAtPublishTime);
                Assert.True(verificationRecord.TokenVisibleOnFreshConnectionAtPublishTime);

                UserRegistered registered = (UserRegistered)registeredRecord.Event;
                EmailVerificationRequested verification = (EmailVerificationRequested)verificationRecord.Event;
                Assert.Equal(user.Id, registered.UserId);
                Assert.Equal(user.Id, verification.UserId);
                Assert.Equal(tokenRow.Id, verification.TokenId);
                Assert.False(string.IsNullOrWhiteSpace(verification.RawToken));

                byte[] expectedHash = new Sha256TokenCryptoService().HashToken(verification.RawToken);
                Assert.NotEqual(Encoding.UTF8.GetBytes(verification.RawToken), tokenRow.TokenHash);
                Assert.Equal(expectedHash, tokenRow.TokenHash);

                // 2. Duplicate registration (case/whitespace variation) -> 409 EMAIL_TAKEN, no extra events/rows.
                HttpResponseMessage duplicateResponse = await client.PostAsJsonAsync(
                    "/api/v1/auth/register",
                    new { email = "alice.learner+1@example.com", password = "AnotherPassword@2026!" });

                await AssertProblemDetailsAsync(duplicateResponse, HttpStatusCode.Conflict, ErrorCodes.EmailTaken);
                Assert.Equal(2, recorder.Events.Count);

                // 3. Register a second user whose token will expire before verify.
                HttpResponseMessage expiringRegister = await client.PostAsJsonAsync(
                    "/api/v1/auth/register",
                    new { email = "expired.user@example.com", password = "Password@2026!" });
                Assert.Equal(HttpStatusCode.Created, expiringRegister.StatusCode);

                EmailVerificationRequested expiringEvent = recorder.Events
                    .Select(static e => e.Event)
                    .OfType<EmailVerificationRequested>()
                    .Single(e => e.UserId != user.Id);

                // Verify bogus token -> 400 TOKEN_INVALID_OR_EXPIRED
                HttpResponseMessage bogusVerify = await client.PostAsJsonAsync(
                    "/api/v1/auth/verify-email",
                    new { token = "totally-unknown-token-value" });
                await AssertProblemDetailsAsync(bogusVerify, HttpStatusCode.BadRequest, ErrorCodes.TokenInvalidOrExpired);

                // 4. Valid token before expiry -> 204 No Content & DB timestamps set.
                clock.UtcNow = BaseUtc.AddMinutes(2);
                HttpResponseMessage validVerify = await client.PostAsJsonAsync(
                    "/api/v1/auth/verify-email",
                    new { token = verification.RawToken });
                Assert.Equal(HttpStatusCode.NoContent, validVerify.StatusCode);

                await using (IdentityDbContext dbAfterVerify = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
                {
                    User verifiedUser = await dbAfterVerify.Users
                        .Include(u => u.Tokens)
                        .AsNoTracking()
                        .SingleAsync(u => u.Id == user.Id);

                    Assert.Equal(clock.UtcNow, verifiedUser.EmailVerifiedAt);
                    Assert.Equal(clock.UtcNow, Assert.Single(verifiedUser.Tokens).ConsumedAt);
                }

                // 5. Reusing already-consumed token -> 400 TOKEN_INVALID_OR_EXPIRED
                HttpResponseMessage reuseVerify = await client.PostAsJsonAsync(
                    "/api/v1/auth/verify-email",
                    new { token = verification.RawToken });
                await AssertProblemDetailsAsync(reuseVerify, HttpStatusCode.BadRequest, ErrorCodes.TokenInvalidOrExpired);

                // 6. Advance clock past TTL -> second user's token expires -> 400 TOKEN_INVALID_OR_EXPIRED
                clock.UtcNow = BaseUtc.AddMinutes(5);
                HttpResponseMessage expiredVerify = await client.PostAsJsonAsync(
                    "/api/v1/auth/verify-email",
                    new { token = expiringEvent.RawToken });
                await AssertProblemDetailsAsync(expiredVerify, HttpStatusCode.BadRequest, ErrorCodes.TokenInvalidOrExpired);

                await using (IdentityDbContext dbAfterExpired = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
                {
                    User stillUnverified = await dbAfterExpired.Users
                        .Include(u => u.Tokens)
                        .AsNoTracking()
                        .SingleAsync(u => u.Id == expiringEvent.UserId);

                    Assert.Null(stillUnverified.EmailVerifiedAt);
                    Assert.Null(Assert.Single(stillUnverified.Tokens).ConsumedAt);
                }
            });
    }

    [Fact]
    public async Task Register_And_VerifyEmail_ValidationAndMalformedRequests_ReturnCanonicalProblemDetails()
    {
        await WithTestHostAsync(
            ttl: TimeSpan.FromMinutes(15),
            async (client, _, recorder, _) =>
            {
                HttpResponseMessage badRegister = await client.PostAsJsonAsync(
                    "/api/v1/auth/register",
                    new { email = "invalid-email", password = "short" });

                using JsonDocument badRegisterJson = await AssertProblemDetailsAsync(
                    badRegister,
                    HttpStatusCode.UnprocessableEntity,
                    ErrorCodes.ValidationFailed);
                Assert.True(badRegisterJson.RootElement.TryGetProperty("errors", out JsonElement errors));
                Assert.True(errors.GetArrayLength() >= 2);

                HttpResponseMessage emptyVerify = await client.PostAsJsonAsync(
                    "/api/v1/auth/verify-email",
                    new { token = "   " });

                await AssertProblemDetailsAsync(
                    emptyVerify,
                    HttpStatusCode.UnprocessableEntity,
                    ErrorCodes.ValidationFailed);

                using StringContent malformedContent = new("{ not-json", Encoding.UTF8, "application/json");
                HttpResponseMessage malformedRegister = await client.PostAsync("/api/v1/auth/register", malformedContent);
                await AssertProblemDetailsAsync(
                    malformedRegister,
                    HttpStatusCode.BadRequest,
                    ErrorCodes.MalformedRequest);

                Assert.Empty(recorder.Events);
            });
    }

    [Fact]
    public async Task Register_ConcurrentDuplicateEmail_AllowsExactlyOneAndReturnsEmailTaken()
    {
        await WithTestHostAsync(
            ttl: TimeSpan.FromMinutes(15),
            async (client, _, recorder, connectionString) =>
            {
                using Barrier barrier = new(2);

                Task<HttpResponseMessage> req1 = Task.Run(async () =>
                {
                    barrier.SignalAndWait();
                    return await client.PostAsJsonAsync(
                        "/api/v1/auth/register",
                        new { email = "race.user@example.com", password = "Password@2026!" });
                });

                Task<HttpResponseMessage> req2 = Task.Run(async () =>
                {
                    barrier.SignalAndWait();
                    return await client.PostAsJsonAsync(
                        "/api/v1/auth/register",
                        new { email = "RACE.USER@example.com", password = "Password@2026!" });
                });

                HttpResponseMessage[] responses = await Task.WhenAll(req1, req2);

                Assert.Equal(1, responses.Count(static r => r.StatusCode == HttpStatusCode.Created));
                HttpResponseMessage conflict = Assert.Single(responses, static r => r.StatusCode == HttpStatusCode.Conflict);
                await AssertProblemDetailsAsync(conflict, HttpStatusCode.Conflict, ErrorCodes.EmailTaken);

                await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                Assert.Equal(1, await db.Users.CountAsync());
                Assert.Equal(2, recorder.Events.Count);
            });
    }

    [Fact]
    public async Task VerifyEmail_ConcurrentSameToken_ConsumesAtomicallyExactlyOnce()
    {
        await WithTestHostAsync(
            ttl: TimeSpan.FromMinutes(15),
            async (client, _, recorder, connectionString) =>
            {
                HttpResponseMessage registerResponse = await client.PostAsJsonAsync(
                    "/api/v1/auth/register",
                    new { email = "atomic.verify@example.com", password = "Password@2026!" });
                Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

                EmailVerificationRequested verification = recorder.Events
                    .Select(static e => e.Event)
                    .OfType<EmailVerificationRequested>()
                    .Single();

                using Barrier barrier = new(2);

                Task<HttpResponseMessage> v1 = Task.Run(async () =>
                {
                    barrier.SignalAndWait();
                    return await client.PostAsJsonAsync(
                        "/api/v1/auth/verify-email",
                        new { token = verification.RawToken });
                });

                Task<HttpResponseMessage> v2 = Task.Run(async () =>
                {
                    barrier.SignalAndWait();
                    return await client.PostAsJsonAsync(
                        "/api/v1/auth/verify-email",
                        new { token = verification.RawToken });
                });

                HttpResponseMessage[] responses = await Task.WhenAll(v1, v2);

                Assert.Equal(1, responses.Count(static r => r.StatusCode == HttpStatusCode.NoContent));
                HttpResponseMessage rejected = Assert.Single(responses, static r => r.StatusCode == HttpStatusCode.BadRequest);
                await AssertProblemDetailsAsync(rejected, HttpStatusCode.BadRequest, ErrorCodes.TokenInvalidOrExpired);

                await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
                User verified = await db.Users.Include(u => u.Tokens).AsNoTracking().SingleAsync();
                Assert.NotNull(verified.EmailVerifiedAt);
                Assert.NotNull(Assert.Single(verified.Tokens).ConsumedAt);
            });
    }

    private async Task WithTestHostAsync(
        TimeSpan ttl,
        Func<HttpClient, MutableTestClock, PostCommitEventRecorder, string, Task> action)
    {
        string dbName = $"idn_ep_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using (IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
            {
                await setupDb.Database.MigrateAsync();
            }

            MutableTestClock clock = new(BaseUtc);
            PostCommitEventRecorder recorder = new(connectionString);

            await using WebApplicationFactory<Program> factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ConnectionStrings:Default", connectionString);
                    builder.UseSetting("Identity:EmailVerificationTokenTtl", ttl.ToString("c"));

                    builder.ConfigureServices(services =>
                    {
                        services.RemoveAll<IClock>();
                        services.AddSingleton<IClock>(clock);
                        services.AddSingleton(recorder);
                        services.AddScoped<IIntegrationEventHandler<UserRegistered>, RecordingUserRegisteredHandler>();
                        services.AddScoped<IIntegrationEventHandler<EmailVerificationRequested>, RecordingEmailVerificationHandler>();
                    });
                });

            using HttpClient client = factory.CreateClient();
            await action(client, clock, recorder, connectionString);
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    private static async Task<JsonDocument> AssertProblemDetailsAsync(
        HttpResponseMessage response,
        HttpStatusCode expectedStatus,
        string expectedCode)
    {
        Assert.Equal(expectedStatus, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        string payload = await response.Content.ReadAsStringAsync();
        JsonDocument doc = JsonDocument.Parse(payload);
        Assert.Equal(expectedCode, doc.RootElement.GetProperty("code").GetString());
        Assert.Equal((int)expectedStatus, doc.RootElement.GetProperty("status").GetInt32());
        return doc;
    }

    private sealed class MutableTestClock(DateTimeOffset initialUtc) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = initialUtc;
    }

    private sealed record RecordedEvent(
        IntegrationEvent Event,
        bool UserVisibleOnFreshConnectionAtPublishTime,
        bool TokenVisibleOnFreshConnectionAtPublishTime);

    private sealed class PostCommitEventRecorder(string connectionString)
    {
        public ConcurrentQueue<RecordedEvent> Events { get; } = new();

        public async Task RecordAsync(Guid userId, Guid? tokenId, IntegrationEvent @event, CancellationToken ct)
        {
            await using IdentityDbContext freshDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            bool userVisible = await freshDb.Users.AnyAsync(u => u.Id == userId, ct);
            bool tokenVisible = tokenId.HasValue
                && await freshDb.Set<UserToken>().AnyAsync(t => t.Id == tokenId.Value, ct);

            Events.Enqueue(new RecordedEvent(@event, userVisible, tokenVisible));
        }
    }

    private sealed class RecordingUserRegisteredHandler(PostCommitEventRecorder recorder)
        : IIntegrationEventHandler<UserRegistered>
    {
        public Task HandleAsync(UserRegistered @event, CancellationToken ct = default)
            => recorder.RecordAsync(@event.UserId, null, @event, ct);
    }

    private sealed class RecordingEmailVerificationHandler(PostCommitEventRecorder recorder)
        : IIntegrationEventHandler<EmailVerificationRequested>
    {
        public Task HandleAsync(EmailVerificationRequested @event, CancellationToken ct = default)
            => recorder.RecordAsync(@event.UserId, @event.TokenId, @event, ct);
    }
}

