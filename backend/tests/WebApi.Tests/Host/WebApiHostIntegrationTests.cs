using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using BrainMemo.SharedKernel.Results;
using BrainMemo.WebApi.Errors;
using BrainMemo.WebApi.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace WebApi.Tests.Host;

public sealed class WebApiHostIntegrationTests
{
    private const string TestSigningKey = "brainmemo-integration-test-signing-key-2026-32bytes";

    [Fact]
    public async Task HealthEndpoint_Returns200WithHealthyJson()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        HttpResponseMessage response = await client.GetAsync("/health");
        string body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument doc = JsonDocument.Parse(body);
        Assert.Equal("Healthy", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal("BrainMemo.WebApi", doc.RootElement.GetProperty("service").GetString());
        Assert.True(doc.RootElement.TryGetProperty("utcNow", out _));
        Assert.Equal(JsonValueKind.Array, doc.RootElement.GetProperty("modules").ValueKind);
    }

    [Fact]
    public async Task UnknownRoute_Returns404ProblemDetailsJson()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        HttpResponseMessage response = await client.GetAsync("/api/v1/nonexistent-endpoint");
        string body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        using JsonDocument doc = JsonDocument.Parse(body);
        Assert.Equal(404, doc.RootElement.GetProperty("status").GetInt32());
        Assert.Equal(ErrorCodes.NotFound, doc.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(doc.RootElement.GetProperty("title").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(doc.RootElement.GetProperty("traceId").GetString()));
    }

    [Fact]
    public async Task JwtAuth_RejectsMissingTokenWith401Problem_AndAcceptsValidJwt()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        HttpResponseMessage unauthenticated = await client.GetAsync("/test-probes/protected");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthenticated.StatusCode);
        Assert.Equal("application/problem+json", unauthenticated.Content.Headers.ContentType?.MediaType);
        using (JsonDocument doc = JsonDocument.Parse(await unauthenticated.Content.ReadAsStringAsync()))
        {
            Assert.Equal(ErrorCodes.Unauthenticated, doc.RootElement.GetProperty("code").GetString());
        }

        string learnerToken = CreateJwt("01960000-0000-7000-8000-000000000001", "LEARNER");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);

        HttpResponseMessage ok = await client.GetAsync("/test-probes/protected");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        HttpResponseMessage forbidden = await client.GetAsync("/test-probes/admin-only");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        Assert.Equal("application/problem+json", forbidden.Content.Headers.ContentType?.MediaType);
        using (JsonDocument doc = JsonDocument.Parse(await forbidden.Content.ReadAsStringAsync()))
        {
            Assert.Equal(ErrorCodes.Forbidden, doc.RootElement.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task LoginRateLimiter_Allows5RequestsPerMinuteAndRejects6thWith429Problem()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        for (int i = 0; i < 5; i++)
        {
            HttpResponseMessage allowed = await client.PostAsync("/test-probes/login", content: null);
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        HttpResponseMessage throttled = await client.PostAsync("/test-probes/login", content: null);
        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.Equal("application/problem+json", throttled.Content.Headers.ContentType?.MediaType);

        using JsonDocument doc = JsonDocument.Parse(await throttled.Content.ReadAsStringAsync());
        Assert.Equal(429, doc.RootElement.GetProperty("status").GetInt32());
        Assert.Equal(ErrorCodes.RateLimited, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task ValidationErrorAndResultErrorAndUnhandledException_ReturnProblemDetails()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        // 1. ModelState validation error -> 422 VALIDATION_FAILED with errors[]
        using StringContent invalidModel = new("{\"email\":\"\"}", Encoding.UTF8, "application/json");
        HttpResponseMessage validationResp = await client.PostAsync("/test-probes/validate", invalidModel);
        Assert.Equal((HttpStatusCode)422, validationResp.StatusCode);
        Assert.Equal("application/problem+json", validationResp.Content.Headers.ContentType?.MediaType);
        using (JsonDocument doc = JsonDocument.Parse(await validationResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(ErrorCodes.ValidationFailed, doc.RootElement.GetProperty("code").GetString());
            Assert.Equal(JsonValueKind.Array, doc.RootElement.GetProperty("errors").ValueKind);
            Assert.True(doc.RootElement.GetProperty("errors").GetArrayLength() > 0);
        }

        // 2. Malformed JSON -> 400 MALFORMED_REQUEST
        using StringContent malformedJson = new("{bad-json", Encoding.UTF8, "application/json");
        HttpResponseMessage malformedResp = await client.PostAsync("/test-probes/validate", malformedJson);
        Assert.Equal(HttpStatusCode.BadRequest, malformedResp.StatusCode);
        using (JsonDocument doc = JsonDocument.Parse(await malformedResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(ErrorCodes.MalformedRequest, doc.RootElement.GetProperty("code").GetString());
        }

        // 3. Domain Result.Failure with metadata (ACCOUNT_LOCKED) -> 403 + lockedUntil/lockReason
        HttpResponseMessage lockedResp = await client.GetAsync("/test-probes/locked");
        Assert.Equal(HttpStatusCode.Forbidden, lockedResp.StatusCode);
        using (JsonDocument doc = JsonDocument.Parse(await lockedResp.Content.ReadAsStringAsync()))
        {
            Assert.Equal(ErrorCodes.AccountLocked, doc.RootElement.GetProperty("code").GetString());
            Assert.Equal("Vi phạm điều khoản", doc.RootElement.GetProperty("lockReason").GetString());
            Assert.True(doc.RootElement.TryGetProperty("lockedUntil", out _));
        }

        // 4. Unhandled exception -> 500 ProblemDetails without leaking internal exception message
        HttpResponseMessage serverErr = await client.GetAsync("/test-probes/boom");
        Assert.Equal(HttpStatusCode.InternalServerError, serverErr.StatusCode);
        string serverBody = await serverErr.Content.ReadAsStringAsync();
        Assert.DoesNotContain("sensitive-internal-secret", serverBody, StringComparison.Ordinal);
        using (JsonDocument doc = JsonDocument.Parse(serverBody))
        {
            Assert.Equal(ErrorCodeMapper.InternalServerErrorCode, doc.RootElement.GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task CorsAndSwagger_AreConfiguredCorrectly()
    {
        await using TestWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        using HttpRequestMessage corsReq = new(HttpMethod.Options, "/health");
        corsReq.Headers.Add("Origin", "http://localhost:5173");
        corsReq.Headers.Add("Access-Control-Request-Method", "GET");

        HttpResponseMessage corsResp = await client.SendAsync(corsReq);
        Assert.True(corsResp.Headers.TryGetValues("Access-Control-Allow-Origin", out IEnumerable<string>? origins));
        Assert.Contains("http://localhost:5173", origins!);

        HttpResponseMessage swaggerResp = await client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, swaggerResp.StatusCode);
        string swaggerJson = await swaggerResp.Content.ReadAsStringAsync();
        Assert.Contains("bearerAuth", swaggerJson, StringComparison.Ordinal);
    }

    private static string CreateJwt(string userId, string role)
    {
        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(TestSigningKey));
        SigningCredentials creds = new(key, SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token = new(
            issuer: "brainmemo-api",
            audience: "brainmemo-web",
            claims:
            [
                new Claim("sub", userId),
                new Claim("role", role),
            ],
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class TestWebApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Issuer"] = "brainmemo-api",
                    ["Jwt:Audience"] = "brainmemo-web",
                    ["Jwt:SigningKey"] = TestSigningKey,
                    ["Cors:AllowedOrigins"] = "http://localhost:5173",
                    ["Swagger:Enabled"] = "true",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.AddControllers().AddApplicationPart(typeof(TestProbeController).Assembly);
            });
        }
    }
}

[ApiController]
[Route("test-probes")]
public sealed class TestProbeController : ControllerBase
{
    [Authorize]
    [HttpGet("protected")]
    public IActionResult Protected() => Ok(new { ok = true });

    [Authorize(Roles = "ADMIN")]
    [HttpGet("admin-only")]
    public IActionResult AdminOnly() => Ok(new { ok = true });

    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    [HttpPost("login")]
    public IActionResult Login() => Ok(new { ok = true });

    [AllowAnonymous]
    [HttpPost("validate")]
    public IActionResult Validate([FromBody] ValidatePayload payload) => Ok(payload);

    [AllowAnonymous]
    [HttpGet("locked")]
    public IActionResult Locked()
    {
        Dictionary<string, object?> metadata = new()
        {
            ["LockedUntil"] = DateTimeOffset.UtcNow.AddDays(3),
            ["LockReason"] = "Vi phạm điều khoản",
        };
        Result result = Result.Failure(new Error(
            ErrorCodes.AccountLocked,
            "Tài khoản đang bị tạm khóa.",
            Metadata: metadata));
        return result.ToActionResult(HttpContext);
    }

    [AllowAnonymous]
    [HttpGet("boom")]
    public IActionResult Boom() => throw new InvalidOperationException("sensitive-internal-secret");

    public sealed class ValidatePayload
    {
        [Required(ErrorMessage = "Email là bắt buộc.")]
        public string Email { get; init; } = string.Empty;
    }
}
