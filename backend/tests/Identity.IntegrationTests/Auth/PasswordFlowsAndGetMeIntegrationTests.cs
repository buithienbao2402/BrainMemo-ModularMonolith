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
public sealed class PasswordFlowsAndGetMeIntegrationTests(MySqlTestDatabaseFixture fixture)
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 13, 9, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ForgotPassword_ExistingUser_GeneratesToken_SecondRequestInvalidatesFirst_UnknownUserDoesNotLeak()
    {
        await WithTestHostAsync(async (factory, clock, resetEvents, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            // 1. Register a user
            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "forgot.flow@example.com", password = "InitialPassword@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            // 2. Forgot password with existing email -> 204 No Content
            HttpResponseMessage forgot1 = await client.PostAsJsonAsync(
                "/api/v1/auth/forgot-password",
                new { email = "  FORGOT.FLOW@example.com " });
            Assert.Equal(HttpStatusCode.NoContent, forgot1.StatusCode);

            PasswordResetRequested event1 = Assert.Single(resetEvents);
            Assert.False(string.IsNullOrWhiteSpace(event1.RawToken));

            // Verify token in MySQL
            await using (IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
            {
                UserToken token1 = await db.UserTokens.SingleAsync(t => t.Id == event1.TokenId);
                Assert.Equal(UserTokenPurpose.ResetPassword, token1.Purpose);
                Assert.Null(token1.ConsumedAt);
            }

            // 3. Re-request forgot password -> 204 No Content, invalidates first token, generates second
            clock.UtcNow = BaseUtc.AddMinutes(5);
            HttpResponseMessage forgot2 = await client.PostAsJsonAsync(
                "/api/v1/auth/forgot-password",
                new { email = "forgot.flow@example.com" });
            Assert.Equal(HttpStatusCode.NoContent, forgot2.StatusCode);

            Assert.Equal(2, resetEvents.Count);
            PasswordResetRequested event2 = resetEvents.Last();
            Assert.NotEqual(event1.RawToken, event2.RawToken);

            await using (IdentityDbContext db = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
            {
                UserToken token1After = await db.UserTokens.SingleAsync(t => t.Id == event1.TokenId);
                Assert.NotNull(token1After.ConsumedAt);
                Assert.Equal(clock.UtcNow, token1After.ConsumedAt);

                UserToken token2 = await db.UserTokens.SingleAsync(t => t.Id == event2.TokenId);
                Assert.Null(token2.ConsumedAt);
            }

            // 4. Forgot password with non-existing email -> 204 No Content (no email leakage!)
            HttpResponseMessage forgotUnknown = await client.PostAsJsonAsync(
                "/api/v1/auth/forgot-password",
                new { email = "completely.nonexistent.user@example.com" });
            Assert.Equal(HttpStatusCode.NoContent, forgotUnknown.StatusCode);
            Assert.Equal(2, resetEvents.Count); // No new event emitted!
        });
    }

    [Fact]
    public async Task ResetPassword_ValidToken_UpdatesPassword_RevokesSessions_AndReplayFails()
    {
        await WithTestHostAsync(async (factory, clock, resetEvents, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            // 1. Register & login
            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "reset.flow@example.com", password = "OldPassword@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            HttpResponseMessage login1 = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "reset.flow@example.com", password = "OldPassword@2026!" });
            Assert.Equal(HttpStatusCode.OK, login1.StatusCode);
            string cookie = ExtractCookieValue(
                Assert.Single(login1.Headers.GetValues("Set-Cookie")),
                AuthCookieConstants.RefreshTokenCookieName);

            // 2. Request forgot password
            HttpResponseMessage forgot = await client.PostAsJsonAsync(
                "/api/v1/auth/forgot-password",
                new { email = "reset.flow@example.com" });
            Assert.Equal(HttpStatusCode.NoContent, forgot.StatusCode);

            PasswordResetRequested resetEvent = Assert.Single(resetEvents);

            // 3. Reset password with raw token -> 204 No Content
            clock.UtcNow = BaseUtc.AddMinutes(10);
            HttpResponseMessage resetResp = await client.PostAsJsonAsync(
                "/api/v1/auth/reset-password",
                new { token = resetEvent.RawToken, newPassword = "NewSecretPassword@2026!" });
            Assert.Equal(HttpStatusCode.NoContent, resetResp.StatusCode);

            // 4. Old refresh session is revoked -> refresh fails with 401
            using (HttpRequestMessage refreshReq = new(HttpMethod.Post, "/api/v1/auth/refresh"))
            {
                refreshReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={cookie}");
                HttpResponseMessage refreshResp = await client.SendAsync(refreshReq);
                await AssertProblemDetailsAsync(refreshResp, HttpStatusCode.Unauthorized, ErrorCodes.Unauthenticated);
            }

            // 5. Old password login fails with 401
            HttpResponseMessage oldLogin = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "reset.flow@example.com", password = "OldPassword@2026!" });
            await AssertProblemDetailsAsync(oldLogin, HttpStatusCode.Unauthorized, ErrorCodes.InvalidCredentials);

            // 6. New password login succeeds with 200
            HttpResponseMessage newLogin = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "reset.flow@example.com", password = "NewSecretPassword@2026!" });
            Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

            // 7. Replaying consumed token fails with 400 TOKEN_INVALID_OR_EXPIRED
            HttpResponseMessage replayResp = await client.PostAsJsonAsync(
                "/api/v1/auth/reset-password",
                new { token = resetEvent.RawToken, newPassword = "AnotherNewPassword@2026!" });
            await AssertProblemDetailsAsync(replayResp, HttpStatusCode.BadRequest, ErrorCodes.TokenInvalidOrExpired);
        });
    }

    [Fact]
    public async Task ChangePassword_ValidCredentials_UpdatesPassword_RevokesSessions_AndGetMeReturnsProfile()
    {
        await WithTestHostAsync(async (factory, clock, _, connectionString) =>
        {
            using HttpClient client = CreateClientWithoutAutoCookies(factory);

            // 1. Register & login
            HttpResponseMessage reg = await client.PostAsJsonAsync(
                "/api/v1/auth/register",
                new { email = "change.getme@example.com", password = "FirstPassword@2026!" });
            Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

            HttpResponseMessage loginResp = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "change.getme@example.com", password = "FirstPassword@2026!" });
            Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

            AuthTokensResponse loginTokens = (await loginResp.Content.ReadFromJsonAsync<AuthTokensResponse>())!;
            string initialCookie = ExtractCookieValue(
                Assert.Single(loginResp.Headers.GetValues("Set-Cookie")),
                AuthCookieConstants.RefreshTokenCookieName);

            // 2. GET /api/v1/auth/me returns current user info
            using (HttpRequestMessage meReq = new(HttpMethod.Get, "/api/v1/auth/me"))
            {
                meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginTokens.AccessToken);
                HttpResponseMessage meResp = await client.SendAsync(meReq);
                Assert.Equal(HttpStatusCode.OK, meResp.StatusCode);

                CurrentUserResponse? me = await meResp.Content.ReadFromJsonAsync<CurrentUserResponse>();
                Assert.NotNull(me);
                Assert.Equal(loginTokens.User.Id, me!.Id);
                Assert.Equal("change.getme@example.com", me.Email);
                Assert.False(me.EmailVerified);
                Assert.False(me.IsAdmin);
                Assert.Equal("ACTIVE", me.AccountStatus);
            }

            // 3. Change password with wrong current password -> 401 INVALID_CREDENTIALS
            using (HttpRequestMessage wrongChangeReq = new(HttpMethod.Post, "/api/v1/auth/change-password")
            {
                Content = JsonContent.Create(new
                {
                    currentPassword = "WrongCurrentPassword@2026!",
                    newPassword = "SecondPassword@2026!",
                }),
            })
            {
                wrongChangeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginTokens.AccessToken);
                HttpResponseMessage wrongChangeResp = await client.SendAsync(wrongChangeReq);
                await AssertProblemDetailsAsync(wrongChangeResp, HttpStatusCode.Unauthorized, ErrorCodes.InvalidCredentials);
            }

            // 4. Change password with correct current password -> 204 No Content & clears cookie
            using (HttpRequestMessage validChangeReq = new(HttpMethod.Post, "/api/v1/auth/change-password")
            {
                Content = JsonContent.Create(new
                {
                    currentPassword = "FirstPassword@2026!",
                    newPassword = "SecondPassword@2026!",
                }),
            })
            {
                validChangeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginTokens.AccessToken);
                HttpResponseMessage validChangeResp = await client.SendAsync(validChangeReq);
                Assert.Equal(HttpStatusCode.NoContent, validChangeResp.StatusCode);

                // Check that refresh cookie was cleared
                string clearedCookie = Assert.Single(validChangeResp.Headers.GetValues("Set-Cookie"));
                Assert.Contains("refreshToken=;", clearedCookie, StringComparison.Ordinal);
            }

            // 5. Old refresh token is revoked -> 401
            using (HttpRequestMessage refreshReq = new(HttpMethod.Post, "/api/v1/auth/refresh"))
            {
                refreshReq.Headers.Add("Cookie", $"{AuthCookieConstants.RefreshTokenCookieName}={initialCookie}");
                HttpResponseMessage refreshResp = await client.SendAsync(refreshReq);
                await AssertProblemDetailsAsync(refreshResp, HttpStatusCode.Unauthorized, ErrorCodes.Unauthenticated);
            }

            // 6. Old password cannot login -> 401
            HttpResponseMessage oldLogin = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "change.getme@example.com", password = "FirstPassword@2026!" });
            await AssertProblemDetailsAsync(oldLogin, HttpStatusCode.Unauthorized, ErrorCodes.InvalidCredentials);

            // 7. New password logs in successfully -> 200
            HttpResponseMessage newLogin = await client.PostAsJsonAsync(
                "/api/v1/auth/login",
                new { email = "change.getme@example.com", password = "SecondPassword@2026!" });
            Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
        });
    }

    private async Task WithTestHostAsync(
        Func<WebApplicationFactory<Program>, MutableTestClock, ConcurrentQueue<PasswordResetRequested>, string, Task> action)
    {
        string dbName = $"idn_pw_{Guid.NewGuid():N}"[..24];
        string connectionString = await fixture.CreateDatabaseAsync(dbName);

        try
        {
            await using (IdentityDbContext setupDb = MySqlTestDatabaseFixture.CreateDbContext(connectionString))
            {
                await setupDb.Database.MigrateAsync();
            }

            MutableTestClock clock = new(BaseUtc);
            ConcurrentQueue<PasswordResetRequested> resetEvents = new();

            await using WebApplicationFactory<Program> factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseEnvironment("Testing");
                    builder.UseSetting("ConnectionStrings:Default", connectionString);

                    builder.ConfigureServices(services =>
                    {
                        services.RemoveAll<IClock>();
                        services.AddSingleton<IClock>(clock);
                        services.AddSingleton(resetEvents);
                        services.AddScoped<IIntegrationEventHandler<PasswordResetRequested>, RecordingPasswordResetHandler>();
                    });
                });

            await action(factory, clock, resetEvents, connectionString);
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

    private sealed class RecordingPasswordResetHandler(ConcurrentQueue<PasswordResetRequested> queue)
        : IIntegrationEventHandler<PasswordResetRequested>
    {
        public Task HandleAsync(PasswordResetRequested @event, CancellationToken ct = default)
        {
            queue.Enqueue(@event);
            return Task.CompletedTask;
        }
    }
}
