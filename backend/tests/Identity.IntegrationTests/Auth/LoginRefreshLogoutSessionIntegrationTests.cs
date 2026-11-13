using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Api.Auth;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.Identity.Infrastructure.Persistence;
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
public sealed class LoginRefreshLogoutSessionIntegrationTests(MySqlTestDatabaseFixture fixture)
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Login_And_ConcurrentRefresh_RotatesCookie_AndAllowsOnlyOneWinner()
    {
        await WithTestHostAsync(async (factory, clock, _, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            // 1. Register user
            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "concurrent.refresh@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            // 2. Wrong password -> 401 INVALID_CREDENTIALS
            HttpResponseMessage badLogin = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "concurrent.refresh@example.com", password = "WrongPassword@2026!" });
            await AssertProblemDetailsAsync(badLogin, HttpStatusCode.Unauthorized, ErrorCodes.InvalidCredentials);

            // 3. Valid login -> 200 OK + Set-Cookie with HttpOnly, SameSite=Strict, Path=/api/v1/auth
            HttpResponseMessage loginResp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "concurrent.refresh@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

            string setCookieHeader = Assert.Single(loginResp.Headers.GetValues("Set-Cookie"));
            Assert.Contains("refreshToken=", setCookieHeader, StringComparison.Ordinal);
            Assert.Contains("path=/api/v1/auth", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("samesite=strict", setCookieHeader, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("httponly", setCookieHeader, StringComparison.OrdinalIgnoreCase);

            string initialRefreshToken = ExtractCookieValue(setCookieHeader, AuthCookieConstants.RefreshTokenCookieName);
            AuthTokensResponse? loginBody = await loginResp.Content.ReadFromJsonAsync<AuthTokensResponse>();
            Assert.NotNull(loginBody);
            Assert.Equal(1800, loginBody!.ExpiresIn);
            Assert.False(string.IsNullOrWhiteSpace(loginBody.AccessToken));

            // 4. Two concurrent refresh requests with the same initialRefreshToken -> 1 wins (200), 1 loses (401)
            clock.UtcNow = BaseUtc.AddMinutes(5);
            using Barrier barrier = new(2);

            Task<HttpResponseMessage> r1 = Task.Run(async () =>
            {
                using HttpRequestMessage req = new(HttpMethod.Post, "/api/v1/auth/refresh");
                req.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={initialRefreshToken}");
                barrier.SignalAndWait();
                return await client.SendAsync(req);
            });

            Task<HttpResponseMessage> r2 = Task.Run(async () =>
            {
                using HttpRequestMessage req = new(HttpMethod.Post, "/api/v1/auth/refresh");
                req.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={initialRefreshToken}");
                barrier.SignalAndWait();
                return await client.SendAsync(req);
            });

            HttpResponseMessage[] results = await Task.WhenAll(r1, r2);

            HttpResponseMessage winner = Assert.Single(results, static r => r.StatusCode == HttpStatusCode.OK);
            HttpResponseMessage loser = Assert.Single(results, static r => r.StatusCode == HttpStatusCode.Unauthorized);
            await AssertProblemDetailsAsync(loser, HttpStatusCode.Unauthorized, ErrorCodes.Unauthenticated);

            string rotatedCookieHeader = Assert.Single(winner.Headers.GetValues("Set-Cookie"));
            string rotatedRefreshToken = ExtractCookieValue(rotatedCookieHeader, AuthCookieConstants.RefreshTokenCookieName);
            Assert.NotEqual(initialRefreshToken, rotatedRefreshToken);

            // 5. Winning rotated token works on next refresh
            clock.UtcNow = BaseUtc.AddMinutes(10);
            using HttpRequestMessage nextRefreshReq = new(HttpMethod.Post, "/api/v1/auth/refresh");
            nextRefreshReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={rotatedRefreshToken}");
            HttpResponseMessage nextRefreshResp = await client.SendAsync(nextRefreshReq);
            Assert.Equal(HttpStatusCode.OK, nextRefreshResp.StatusCode);

            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            RefreshSession dbSession = await db.RefreshSessions.AsNoTracking().SingleAsync();
            Assert.Equal(clock.UtcNow, dbSession.LastUsedAt);
            Assert.Null(dbSession.RevokedAt);
        });
    }

    [Fact]
    public async Task LockedAccount_IsBlockedOnLogin_Refresh_AndAuthenticatedEndpoints_AndAutoUnlocksOnExpiry()
    {
        await WithTestHostAsync(async (factory, clock, unlockedEvents, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            // 1. Register & login learner
            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "locked.learner@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            HttpResponseMessage loginResp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "locked.learner@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

            AuthTokensResponse loginTokens = (await loginResp.Content.ReadFromJsonAsync<AuthTokensResponse>())!;
            string refreshCookie = ExtractCookieValue(
                Assert.Single(loginResp.Headers.GetValues("Set-Cookie")),
                AuthCookieConstants.RefreshTokenCookieName);

            Guid learnerId = loginTokens.User.Id;
            Guid adminId = UuidV7.NewGuid(BaseUtc);
            Guid sanctionId = UuidV7.NewGuid(BaseUtc);
            DateTimeOffset lockedUntil = BaseUtc.AddHours(2);

            // 2. Lock learner via IIdentityContract
            using (IServiceScope scope = factory.Services.CreateScope())
            {
                IIdentityContract contract = scope.ServiceProvider.GetRequiredService<IIdentityContract>();
                Result lockRes = await contract.LockAccount(
                    learnerId,
                    LockType.Temporary,
                    lockedUntil,
                    "Vi phạm nội quy bình luận",
                    sanctionId,
                    adminId);
                Assert.True(lockRes.IsSuccess);
            }

            // 3. Authenticated endpoint (GET /api/v1/auth/sessions) with pre-existing JWT is blocked by AccountStatusMiddleware (403 ACCOUNT_LOCKED)
            using (HttpRequestMessage sessionsReq = new(HttpMethod.Get, "/api/v1/auth/sessions"))
            {
                sessionsReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginTokens.AccessToken);
                HttpResponseMessage sessionsResp = await client.SendAsync(sessionsReq);
                using JsonDocument problemDoc = await AssertProblemDetailsAsync(
                    sessionsResp,
                    HttpStatusCode.Forbidden,
                    ErrorCodes.AccountLocked);
                Assert.Equal("Vi phạm nội quy bình luận", problemDoc.RootElement.GetProperty("lockReason").GetString());
                Assert.True(problemDoc.RootElement.TryGetProperty("lockedUntil", out _));
            }

            // 4. Login while locked -> 403 ACCOUNT_LOCKED with lockedUntil & lockReason
            HttpResponseMessage lockedLoginResp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "locked.learner@example.com", password = "Password@2026!" });
            using (JsonDocument lockedLoginDoc = await AssertProblemDetailsAsync(
                       lockedLoginResp,
                       HttpStatusCode.Forbidden,
                       ErrorCodes.AccountLocked))
            {
                Assert.Equal("Vi phạm nội quy bình luận", lockedLoginDoc.RootElement.GetProperty("lockReason").GetString());
                Assert.True(lockedLoginDoc.RootElement.TryGetProperty("lockedUntil", out _));
            }

            // 5. Refresh while locked -> 401 (since LockAccount revoked sessions)
            using (HttpRequestMessage refreshReq = new(HttpMethod.Post, "/api/v1/auth/refresh"))
            {
                refreshReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={refreshCookie}");
                HttpResponseMessage refreshResp = await client.SendAsync(refreshReq);
                await AssertProblemDetailsAsync(refreshResp, HttpStatusCode.Unauthorized, ErrorCodes.Unauthenticated);
            }

            // 6. Advance clock past lockedUntil -> Login auto-unlocks expired lock, persists ACTIVE, and publishes AccountUnlocked
            clock.UtcNow = lockedUntil.AddMinutes(1);
            HttpResponseMessage unlockedLoginResp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "locked.learner@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.OK, unlockedLoginResp.StatusCode);

            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            User reloaded = await db.Users.AsNoTracking().SingleAsync(u => u.Id == learnerId);
            Assert.Equal(AccountStatus.Active, reloaded.AccountStatus);
            Assert.Null(reloaded.LockedUntil);
            Assert.Null(reloaded.LockReason);

            AccountUnlocked unlockedEvt = Assert.Single(unlockedEvents);
            Assert.Equal(learnerId, unlockedEvt.UserId);
            Assert.Equal(sanctionId, unlockedEvt.SanctionId);
            Assert.Equal(UnlockKind.AutoExpired, unlockedEvt.Kind);
        });
    }

    [Fact]
    public async Task Sessions_List_Revoke_Logout_And_LogoutAll_WorkEndToEnd()
    {
        await WithTestHostAsync(async (factory, clock, _, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "multi.device@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            // Login Device 1
            using HttpRequestMessage login1Req = new(HttpMethod.Post, "/api/v1/auth/login")
            {
                Content = JsonContent.Create(new { email = "multi.device@example.com", password = "Password@2026!" }),
            };
            login1Req.Headers.UserAgent.ParseAdd("DeviceOne/1.0");
            HttpResponseMessage login1Resp = await client.SendAsync(login1Req);
            Assert.Equal(HttpStatusCode.OK, login1Resp.StatusCode);
            string cookie1 = ExtractCookieValue(
                Assert.Single(login1Resp.Headers.GetValues("Set-Cookie")),
                AuthCookieConstants.RefreshTokenCookieName);
            AuthTokensResponse tokens1 = (await login1Resp.Content.ReadFromJsonAsync<AuthTokensResponse>())!;

            // Login Device 2
            clock.UtcNow = BaseUtc.AddMinutes(1);
            using HttpRequestMessage login2Req = new(HttpMethod.Post, "/api/v1/auth/login")
            {
                Content = JsonContent.Create(new { email = "multi.device@example.com", password = "Password@2026!" }),
            };
            login2Req.Headers.UserAgent.ParseAdd("DeviceTwo/2.0");
            HttpResponseMessage login2Resp = await client.SendAsync(login2Req);
            Assert.Equal(HttpStatusCode.OK, login2Resp.StatusCode);
            string cookie2 = ExtractCookieValue(
                Assert.Single(login2Resp.Headers.GetValues("Set-Cookie")),
                AuthCookieConstants.RefreshTokenCookieName);

            // List sessions from Device 1
            using HttpRequestMessage listReq = new(HttpMethod.Get, "/api/v1/auth/sessions");
            listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens1.AccessToken);
            listReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={cookie1}");
            HttpResponseMessage listResp = await client.SendAsync(listReq);
            Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);

            List<SessionResponse> sessions = (await listResp.Content.ReadFromJsonAsync<List<SessionResponse>>())!;
            Assert.Equal(2, sessions.Count);
            SessionResponse currentSession = Assert.Single(sessions, static s => s.IsCurrent);
            SessionResponse otherSession = Assert.Single(sessions, static s => !s.IsCurrent);
            Assert.Contains("DeviceOne", currentSession.UserAgent, StringComparison.Ordinal);
            Assert.Contains("DeviceTwo", otherSession.UserAgent, StringComparison.Ordinal);

            // Revoke Device 2 session from Device 1
            using HttpRequestMessage revokeReq = new(HttpMethod.Delete, $"/api/v1/auth/sessions/{otherSession.Id}");
            revokeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens1.AccessToken);
            revokeReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={cookie1}");
            HttpResponseMessage revokeResp = await client.SendAsync(revokeReq);
            Assert.Equal(HttpStatusCode.NoContent, revokeResp.StatusCode);

            // Device 2 refresh now fails with 401
            using HttpRequestMessage refresh2Req = new(HttpMethod.Post, "/api/v1/auth/refresh");
            refresh2Req.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={cookie2}");
            HttpResponseMessage refresh2Resp = await client.SendAsync(refresh2Req);
            await AssertProblemDetailsAsync(refresh2Resp, HttpStatusCode.Unauthorized, ErrorCodes.Unauthenticated);

            // Login Device 3, then LogoutAll from Device 1
            HttpResponseMessage login3Resp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "multi.device@example.com", password = "Password@2026!" });
            Assert.Equal(HttpStatusCode.OK, login3Resp.StatusCode);

            using HttpRequestMessage logoutAllReq = new(HttpMethod.Post, "/api/v1/auth/logout-all");
            logoutAllReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens1.AccessToken);
            HttpResponseMessage logoutAllResp = await client.SendAsync(logoutAllReq);
            Assert.Equal(HttpStatusCode.NoContent, logoutAllResp.StatusCode);

            await using IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString);
            List<RefreshSession> allSessions = await db.RefreshSessions.AsNoTracking().ToListAsync();
            Assert.Equal(3, allSessions.Count);
            Assert.All(allSessions, static s => Assert.NotNull(s.RevokedAt));
        });
    }

    private async Task WithTestHostAsync(
        Func<WebApplicationFactory<Program>, MutableTestClock, ConcurrentQueue<AccountUnlocked>, string, Task> action)
    {
        string dbName = $"idn_s3_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using (IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
            {
                await setupDb.Database.MigrateAsync();
            }

            MutableTestClock clock = new(BaseUtc);
            ConcurrentQueue<AccountUnlocked> unlockedEvents = new();

            await using WebApplicationFactory<Program> factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Testing");
                    builder.UseSetting("ConnectionStrings:Default", connectionString);

                    builder.ConfigureServices(services =>
                    {
                        services.RemoveAll<IClock>();
                        services.AddSingleton<IClock>(clock);
                        services.AddSingleton(unlockedEvents);
                        services.AddScoped<IIntegrationEventHandler<AccountUnlocked>, RecordingAccountUnlockedHandler>();
                    });
                });

            await action(factory, clock, unlockedEvents, connectionString);
        }
        finally
        {
            await fixture.DropDatabaseAsync(dbName);
        }
    }

    private static HttpClient CreateClientWithoutAutoCookies(WebApplicationFactory<Program> factory)
        => factory.CreateDefaultClient();

    private static string ExtractCookieValue(string setCookieHeader, string cookieName)
    {
        string prefix = $"{cookieName}=";
        int start = setCookieHeader.IndexOf(prefix, StringComparison.Ordinal);
        Assert.True(start >= 0, $"Set-Cookie header did not contain '{prefix}': {setCookieHeader}");
        start += prefix.Length;
        int end = setCookieHeader.IndexOf(';', start);
        return end >= 0 ? setCookieHeader[start..end] : setCookieHeader[start..];
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

    private sealed class RecordingAccountUnlockedHandler(ConcurrentQueue<AccountUnlocked> queue)
        : IIntegrationEventHandler<AccountUnlocked>
    {
        public Task HandleAsync(AccountUnlocked @event, CancellationToken ct = default)
        {
            queue.Enqueue(@event);
            return Task.CompletedTask;
        }
    }
}
