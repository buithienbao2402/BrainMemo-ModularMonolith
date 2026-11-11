using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace WebApi.Tests.Storage;

public sealed class FilesEndpointTests
{
    private const string TestSigningKey = "brainmemo-files-endpoint-test-signing-key-2026";
    private const string TestUserId = "01960000-0000-7000-8000-000000000042";

    [Fact]
    public async Task CreateUploadUrl_WithoutBearerToken_Returns401UnauthenticatedProblem()
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();

        using StringContent body = CreateJsonBody(new
        {
            purpose = "AVATAR",
            fileName = "avatar.png",
            sizeBytes = 1024,
            contentType = "image/png",
        });

        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using JsonDocument doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ErrorCodes.Unauthenticated, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task CreateUploadUrl_WithInvalidSubClaim_Returns401UnauthenticatedProblem()
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateJwt("not-a-guid"));

        using StringContent body = CreateJsonBody(new
        {
            purpose = "AVATAR",
            fileName = "avatar.png",
            sizeBytes = 1024,
            contentType = "image/png",
        });

        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        using JsonDocument doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ErrorCodes.Unauthenticated, doc.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task CreateUploadUrl_ValidAvatarAndCourseResource_ReturnsUploadUrlDto()
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateJwt(TestUserId));

        Guid courseId = Guid.Parse("01960000-0000-7000-8000-000000000999");
        using StringContent body = CreateJsonBody(new
        {
            purpose = "COURSE_RESOURCE",
            fileName = "Lecture 01.PDF",
            sizeBytes = 1_048_576,
            contentType = "application/pdf",
            courseId,
        });

        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);
        string raw = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument doc = JsonDocument.Parse(raw);
        JsonElement root = doc.RootElement;

        string uploadKey = root.GetProperty("uploadKey").GetString()!;
        Assert.StartsWith($"tmp/{TestUserId}/", uploadKey, StringComparison.Ordinal);
        Assert.EndsWith(".pdf", uploadKey, StringComparison.Ordinal);
        Assert.Contains("https://stub-storage.local/", root.GetProperty("uploadUrl").GetString(), StringComparison.Ordinal);
        Assert.Equal("PUT", root.GetProperty("method").GetString());
        Assert.Equal("application/pdf", root.GetProperty("headers").GetProperty("Content-Type").GetString());
        Assert.True(root.TryGetProperty("expiresAt", out JsonElement expiresAtElement));
        Assert.True(DateTimeOffset.TryParse(expiresAtElement.GetString(), out _));

        Assert.NotNull(factory.StubStorage.LastCall);
        Assert.Equal(uploadKey, factory.StubStorage.LastCall!.TmpKey);
        Assert.Equal("application/pdf", factory.StubStorage.LastCall.ContentType);
        Assert.Equal(FileUploadPolicy.MaxFileBytes, factory.StubStorage.LastCall.MaxBytes);
        Assert.Equal(TimeSpan.FromMinutes(15), factory.StubStorage.LastCall.Ttl);
    }

    [Theory]
    [InlineData("AVATAR", "big.png", 5_242_881, "image/png")]
    [InlineData("COURSE_RESOURCE", "huge.pdf", 20_971_521, "application/pdf")]
    public async Task CreateUploadUrl_WhenFileExceedsLimit_Returns422FileTooLarge(
        string purpose,
        string fileName,
        long sizeBytes,
        string contentType)
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateJwt(TestUserId));

        using StringContent body = CreateJsonBody(new { purpose, fileName, sizeBytes, contentType });
        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);

        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using JsonDocument doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ErrorCodes.FileTooLarge, doc.RootElement.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("AVATAR", "malware.exe", 1024, "application/octet-stream")]
    [InlineData("AVATAR", "avatar.svg", 1024, "image/svg+xml")]
    [InlineData("REPORT_EVIDENCE", "evidence.pdf", 1024, "application/pdf")]
    [InlineData("ASSIGNMENT_FILE", "shell.sh", 1024, "text/x-shellscript")]
    public async Task CreateUploadUrl_WhenFileTypeDisallowed_Returns422FileTypeNotAllowed(
        string purpose,
        string fileName,
        long sizeBytes,
        string contentType)
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateJwt(TestUserId));

        using StringContent body = CreateJsonBody(new { purpose, fileName, sizeBytes, contentType });
        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);

        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using JsonDocument doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ErrorCodes.FileTypeNotAllowed, doc.RootElement.GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("""{"fileName":"avatar.png","sizeBytes":1024,"contentType":"image/png"}""")]
    [InlineData("""{"purpose":"AVATAR","fileName":"","sizeBytes":1024,"contentType":"image/png"}""")]
    [InlineData("""{"purpose":"AVATAR","fileName":"avatar.png","sizeBytes":0,"contentType":"image/png"}""")]
    public async Task CreateUploadUrl_WhenPayloadInvalid_Returns422ValidationFailed(string rawJson)
    {
        await using StubFilesWebApiFactory factory = new();
        using HttpClient client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateJwt(TestUserId));

        using StringContent body = new(rawJson, Encoding.UTF8, "application/json");
        HttpResponseMessage response = await client.PostAsync("/api/v1/files/upload-urls", body);

        Assert.Equal((HttpStatusCode)422, response.StatusCode);
        using JsonDocument doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(ErrorCodes.ValidationFailed, doc.RootElement.GetProperty("code").GetString());
    }

    private static StringContent CreateJsonBody(object payload)
        => new(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

    private static string CreateJwt(string userId)
    {
        SymmetricSecurityKey key = new(Encoding.UTF8.GetBytes(TestSigningKey));
        SigningCredentials creds = new(key, SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token = new(
            issuer: "brainmemo-api",
            audience: "brainmemo-web",
            claims:
            [
                new Claim("sub", userId),
                new Claim("role", "LEARNER"),
            ],
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private sealed class StubFilesWebApiFactory : WebApplicationFactory<Program>
    {
        public RecordingStubFileStorage StubStorage { get; } = new();

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
                    ["Swagger:Enabled"] = "false",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IFileStorage>();
                services.AddSingleton<IFileStorage>(StubStorage);
            });
        }
    }

    private sealed record UploadCall(string TmpKey, string ContentType, long MaxBytes, TimeSpan Ttl);

    private sealed class RecordingStubFileStorage : IFileStorage
    {
        public UploadCall? LastCall { get; private set; }

        public Task<PresignedUpload> CreateUploadUrl(
            string tmpKey,
            string contentType,
            long maxBytes,
            TimeSpan ttl,
            CancellationToken ct = default)
        {
            LastCall = new UploadCall(tmpKey, contentType, maxBytes, ttl);
            DateTimeOffset expiresAt = DateTimeOffset.UtcNow.Add(ttl);
            Dictionary<string, string> headers = new(StringComparer.OrdinalIgnoreCase)
            {
                ["Content-Type"] = contentType,
            };

            return Task.FromResult(new PresignedUpload(
                tmpKey,
                $"https://stub-storage.local/{tmpKey}?X-Amz-Signature=stub",
                expiresAt,
                headers));
        }

        public Task<FileHead?> Head(string key, CancellationToken ct = default)
            => Task.FromResult<FileHead?>(null);

        public Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default)
            => Task.FromResult(finalKey);

        public Task<string> CreateDownloadUrl(
            string key,
            TimeSpan ttl,
            string? downloadName = null,
            CancellationToken ct = default)
            => Task.FromResult($"https://stub-storage.local/{key}");

        public Task Delete(string key, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task DeleteByPrefix(string prefix, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}

