using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.BuildingBlocks.Infrastructure.Storage;
using BrainMemo.BuildingBlocks.Infrastructure.Time;
using BrainMemo.SharedKernel.Time;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace WebApi.Tests.Storage;

public sealed class S3FileStorageMinioIntegrationTests
{
    private const string TestSigningKey = "brainmemo-minio-integration-signing-key-2026-32";

    [Fact]
    public async Task FullObjectLifecycle_PresignedPutHeadCommitDownloadDeleteAndDeleteByPrefix_WorksAgainstMinio()
    {
        S3Options options = ResolveMinioOptions();
        using S3FileStorage storage = new(
            Options.Create(options),
            new SystemClock(),
            NullLogger<S3FileStorage>.Instance);
        using HttpClient externalHttp = new();

        Guid runId = UuidV7.NewGuid();
        Guid userId = UuidV7.NewGuid();
        string tmpKey = FileUploadPolicy.BuildTempObjectKey(userId, UuidV7.NewGuid(), ".png");
        string finalKey = $"avatars/{userId:D}/{runId:D}.png";
        string batchPrefix = $"courses/{runId:D}/resources/";
        string batchKey1 = $"{batchPrefix}item-1.txt";
        string batchKey2 = $"{batchPrefix}nested/item-2.txt";
        string siblingKey = $"courses/{runId:D}/cover/keep.png";

        byte[] pngPayload = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4];

        try
        {
            // 1. CreateUploadUrl + direct HTTP PUT (same client flow as browser XHR)
            PresignedUpload upload = await storage.CreateUploadUrl(
                tmpKey,
                "image/png",
                FileUploadPolicy.MaxImageBytes,
                TimeSpan.FromMinutes(10));

            Assert.Equal(tmpKey, upload.UploadKey);
            Assert.StartsWith("http://", upload.UploadUrl, StringComparison.OrdinalIgnoreCase);
            Assert.NotNull(upload.Headers);
            Assert.Equal("image/png", upload.Headers!["Content-Type"]);

            await PutBytesWithSignedHeadersAsync(externalHttp, upload.UploadUrl, upload.Headers, pngPayload);

            // 2. Head verifies exact byte length and Content-Type
            FileHead? tmpHead = await storage.Head(tmpKey);
            Assert.NotNull(tmpHead);
            Assert.Equal(pngPayload.Length, tmpHead!.Size);
            Assert.Equal("image/png", tmpHead.ContentType);
            Assert.False(string.IsNullOrWhiteSpace(tmpHead.ETag));

            // 3. Commit copies tmp -> final and cleans up tmp best-effort
            string committedKey = await storage.Commit(tmpKey, finalKey);
            Assert.Equal(finalKey, committedKey);

            FileHead? finalHead = await storage.Head(finalKey);
            Assert.NotNull(finalHead);
            Assert.Equal(pngPayload.Length, finalHead!.Size);
            Assert.Equal("image/png", finalHead.ContentType);
            Assert.Null(await storage.Head(tmpKey));

            // 4. CreateDownloadUrl serves exact object bytes + Content-Disposition header
            string downloadUrl = await storage.CreateDownloadUrl(
                finalKey,
                TimeSpan.FromMinutes(15),
                downloadName: "ảnh đại diện.png");

            using HttpResponseMessage downloadResponse = await externalHttp.GetAsync(downloadUrl);
            Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
            byte[] downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
            Assert.Equal(pngPayload, downloadedBytes);

            Assert.True(downloadResponse.Content.Headers.TryGetValues("Content-Disposition", out IEnumerable<string>? dispValues));
            Assert.Contains(dispValues!, v => v.StartsWith("attachment;", StringComparison.OrdinalIgnoreCase));

            // 5. Delete single object removes it and Head returns null
            await storage.Delete(finalKey);
            Assert.Null(await storage.Head(finalKey));

            // 6. DeleteByPrefix deletes matching prefix only and leaves siblings intact
            byte[] txtPayload = Encoding.UTF8.GetBytes("hello brainmemo minio prefix cleanup");
            await UploadDirectAsync(storage, externalHttp, batchKey1, "text/plain", txtPayload);
            await UploadDirectAsync(storage, externalHttp, batchKey2, "text/plain", txtPayload);
            await UploadDirectAsync(storage, externalHttp, siblingKey, "image/png", pngPayload);

            await storage.DeleteByPrefix(batchPrefix);

            Assert.Null(await storage.Head(batchKey1));
            Assert.Null(await storage.Head(batchKey2));
            Assert.NotNull(await storage.Head(siblingKey));
        }
        finally
        {
            await storage.DeleteByPrefix($"tmp/{userId:D}/");
            await storage.DeleteByPrefix($"avatars/{userId:D}/");
            await storage.DeleteByPrefix($"courses/{runId:D}/");
        }
    }

    [Fact]
    public async Task PostUploadUrlsEndpoint_UploadsDirectlyToMinioAndIsReadableViaIFileStorage()
    {
        S3Options options = ResolveMinioOptions();
        await using MinioWebApiFactory factory = new(options);
        using HttpClient apiClient = factory.CreateClient();
        using HttpClient s3HttpClient = new();

        Guid userId = UuidV7.NewGuid();
        Guid courseId = UuidV7.NewGuid();
        apiClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateJwt(userId.ToString("D")));

        byte[] pdfBytes = Encoding.UTF8.GetBytes("%PDF-1.4\n%BrainMemo MinIO Integration Test\n%%EOF");
        using StringContent requestBody = new(
            JsonSerializer.Serialize(new
            {
                purpose = "COURSE_RESOURCE",
                fileName = "module-overview.pdf",
                sizeBytes = pdfBytes.Length,
                contentType = "application/pdf",
                courseId,
            }),
            Encoding.UTF8,
            "application/json");

        string? uploadedKey = null;
        IFileStorage fileStorage = factory.Services.GetRequiredService<IFileStorage>();

        try
        {
            HttpResponseMessage apiResponse = await apiClient.PostAsync("/api/v1/files/upload-urls", requestBody);
            Assert.Equal(HttpStatusCode.OK, apiResponse.StatusCode);

            using JsonDocument doc = JsonDocument.Parse(await apiResponse.Content.ReadAsStringAsync());
            JsonElement root = doc.RootElement;
            uploadedKey = root.GetProperty("uploadKey").GetString()!;
            string uploadUrl = root.GetProperty("uploadUrl").GetString()!;
            string method = root.GetProperty("method").GetString()!;

            Assert.Equal("PUT", method);
            Assert.StartsWith($"tmp/{userId:D}/", uploadedKey, StringComparison.Ordinal);
            Assert.EndsWith(".pdf", uploadedKey, StringComparison.Ordinal);

            Dictionary<string, string> headers = new(StringComparer.OrdinalIgnoreCase);
            foreach (JsonProperty prop in root.GetProperty("headers").EnumerateObject())
            {
                headers[prop.Name] = prop.Value.GetString()!;
            }

            await PutBytesWithSignedHeadersAsync(s3HttpClient, uploadUrl, headers, pdfBytes);

            FileHead? head = await fileStorage.Head(uploadedKey);
            Assert.NotNull(head);
            Assert.Equal(pdfBytes.Length, head!.Size);
            Assert.Equal("application/pdf", head.ContentType);
        }
        finally
        {
            if (!string.IsNullOrWhiteSpace(uploadedKey))
            {
                await fileStorage.Delete(uploadedKey);
            }
        }
    }

    private static async Task UploadDirectAsync(
        S3FileStorage storage,
        HttpClient httpClient,
        string key,
        string contentType,
        byte[] bytes)
    {
        PresignedUpload upload = await storage.CreateUploadUrl(
            key,
            contentType,
            bytes.Length,
            TimeSpan.FromMinutes(10));

        await PutBytesWithSignedHeadersAsync(httpClient, upload.UploadUrl, upload.Headers, bytes);
    }

    private static async Task PutBytesWithSignedHeadersAsync(
        HttpClient httpClient,
        string url,
        IReadOnlyDictionary<string, string>? headers,
        byte[] bytes)
    {
        using ByteArrayContent content = new(bytes);
        if (headers is not null && headers.TryGetValue("Content-Type", out string? contentType))
        {
            content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        }

        using HttpRequestMessage request = new(HttpMethod.Put, url)
        {
            Content = content,
        };

        if (headers is not null)
        {
            foreach (KeyValuePair<string, string> header in headers)
            {
                if (!string.Equals(header.Key, "Content-Type", StringComparison.OrdinalIgnoreCase))
                {
                    request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }
        }

        using HttpResponseMessage response = await httpClient.SendAsync(request);
        string errorBody = response.IsSuccessStatusCode ? string.Empty : await response.Content.ReadAsStringAsync();
        Assert.True(
            response.IsSuccessStatusCode,
            $"MinIO presigned PUT failed with {(int)response.StatusCode} {response.StatusCode}: {errorBody}");
    }

    private static S3Options ResolveMinioOptions()
    {
        return new S3Options
        {
            Endpoint = GetEnvOrDefault("S3__Endpoint", "http://localhost:9000"),
            AccessKey = GetEnvOrDefault("S3__AccessKey", "brainmemo_minio"),
            SecretKey = GetEnvOrDefault("S3__SecretKey", "brainmemo_minio_dev_pw"),
            Bucket = GetEnvOrDefault("S3__Bucket", "brainmemo-media"),
            Region = GetEnvOrDefault("S3__Region", "auto"),
            ForcePathStyle = !bool.TryParse(Environment.GetEnvironmentVariable("S3__ForcePathStyle"), out bool parsed) || parsed,
            UploadUrlTtlMinutes = 15,
            DownloadUrlTtlMinutes = 15,
        };
    }

    private static string GetEnvOrDefault(string name, string fallback)
    {
        string? value = Environment.GetEnvironmentVariable(name);
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

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

    private sealed class MinioWebApiFactory(S3Options s3Options) : WebApplicationFactory<Program>
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
                    ["Swagger:Enabled"] = "false",
                    ["S3:Endpoint"] = s3Options.Endpoint,
                    ["S3:AccessKey"] = s3Options.AccessKey,
                    ["S3:SecretKey"] = s3Options.SecretKey,
                    ["S3:Bucket"] = s3Options.Bucket,
                    ["S3:Region"] = s3Options.Region,
                    ["S3:ForcePathStyle"] = s3Options.ForcePathStyle.ToString(),
                });
            });
        }
    }
}

