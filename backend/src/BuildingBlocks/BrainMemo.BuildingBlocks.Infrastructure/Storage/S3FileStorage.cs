using System.Net;
using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BrainMemo.BuildingBlocks.Infrastructure.Storage;

/// <summary>
/// S3-compatible object storage implementation for Cloudflare R2 and MinIO (DEC-05, DEC-06, DEC-18).
/// </summary>
public sealed class S3FileStorage : IFileStorage, IDisposable
{
    private readonly S3Options _options;
    private readonly IClock _clock;
    private readonly ILogger<S3FileStorage> _logger;
    private readonly Lazy<ClientHolder> _clientHolder;
    private readonly bool _ownsClient;

    public S3FileStorage(
        IOptions<S3Options> options,
        IClock clock,
        ILogger<S3FileStorage> logger)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(clock);
        ArgumentNullException.ThrowIfNull(logger);

        _options = options.Value;
        _clock = clock;
        _logger = logger;
        _ownsClient = true;
        _clientHolder = new Lazy<ClientHolder>(() => CreateClient(_options), LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public S3FileStorage(
        IAmazonS3 s3Client,
        IOptions<S3Options> options,
        IClock clock,
        ILogger<S3FileStorage> logger,
        Protocol presignProtocol = Protocol.HTTPS)
    {
        ArgumentNullException.ThrowIfNull(s3Client);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(clock);
        ArgumentNullException.ThrowIfNull(logger);

        _options = options.Value;
        ValidateBucket(_options.Bucket);
        _clock = clock;
        _logger = logger;
        _ownsClient = false;
        _clientHolder = new Lazy<ClientHolder>(() => new ClientHolder(s3Client, presignProtocol));
    }

    public async Task<PresignedUpload> CreateUploadUrl(
        string tmpKey,
        string contentType,
        long maxBytes,
        TimeSpan ttl,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        string normalizedKey = NormalizeObjectKey(tmpKey, nameof(tmpKey));
        if (string.IsNullOrWhiteSpace(contentType))
        {
            throw new ArgumentException("Content-Type is required.", nameof(contentType));
        }

        if (maxBytes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxBytes), "maxBytes must be positive.");
        }

        if (ttl <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(ttl), "ttl must be positive.");
        }

        string normalizedContentType = contentType.Trim();
        ClientHolder holder = _clientHolder.Value;
        DateTimeOffset expiresAt = _clock.UtcNow.ToUniversalTime().Add(ttl);

        GetPreSignedUrlRequest request = new()
        {
            BucketName = _options.Bucket,
            Key = normalizedKey,
            Verb = HttpVerb.PUT,
            ContentType = normalizedContentType,
            Expires = expiresAt.UtcDateTime,
            Protocol = holder.PresignProtocol,
        };

        // Note: SigV4 presigned PUT enforces Content-Type and expiry; byte ceiling (maxBytes)
        // is verified on POST /files/upload-urls and re-verified via Head() before Commit() (DEC-05).
        string url = await holder.Client.GetPreSignedURLAsync(request).ConfigureAwait(false);

        Dictionary<string, string> headers = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Content-Type"] = normalizedContentType,
        };

        return new PresignedUpload(normalizedKey, url, expiresAt, headers);
    }

    public async Task<FileHead?> Head(string key, CancellationToken ct = default)
    {
        string normalizedKey = NormalizeObjectKey(key, nameof(key));
        ClientHolder holder = _clientHolder.Value;

        try
        {
            GetObjectMetadataResponse metadata = await holder.Client
                .GetObjectMetadataAsync(_options.Bucket, normalizedKey, ct)
                .ConfigureAwait(false);

            string resolvedContentType = !string.IsNullOrWhiteSpace(metadata.Headers.ContentType)
                ? metadata.Headers.ContentType
                : "application/octet-stream";

            string? eTag = string.IsNullOrWhiteSpace(metadata.ETag) ? null : metadata.ETag;
            return new FileHead(metadata.Headers.ContentLength, resolvedContentType, eTag);
        }
        catch (AmazonS3Exception ex) when (IsNotFound(ex))
        {
            return null;
        }
    }

    public async Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default)
    {
        string normalizedTmpKey = NormalizeObjectKey(tmpKey, nameof(tmpKey));
        string normalizedFinalKey = NormalizeObjectKey(finalKey, nameof(finalKey));
        ClientHolder holder = _clientHolder.Value;

        if (!string.Equals(normalizedTmpKey, normalizedFinalKey, StringComparison.Ordinal))
        {
            CopyObjectRequest copyRequest = new()
            {
                SourceBucket = _options.Bucket,
                SourceKey = normalizedTmpKey,
                DestinationBucket = _options.Bucket,
                DestinationKey = normalizedFinalKey,
            };

            await holder.Client.CopyObjectAsync(copyRequest, ct).ConfigureAwait(false);

            try
            {
                await holder.Client
                    .DeleteObjectAsync(_options.Bucket, normalizedTmpKey, ct)
                    .ConfigureAwait(false);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Lifecycle rule clears tmp/ within 24h (DEC-05), so best-effort cleanup never fails commit.
                _logger.LogWarning(
                    ex,
                    "Best-effort cleanup failed for temporary S3 object {TmpKey} after commit to {FinalKey}.",
                    normalizedTmpKey,
                    normalizedFinalKey);
            }
        }

        return normalizedFinalKey;
    }

    public async Task<string> CreateDownloadUrl(
        string key,
        TimeSpan ttl,
        string? downloadName = null,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        string normalizedKey = NormalizeObjectKey(key, nameof(key));
        if (ttl <= TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(ttl), "ttl must be positive.");
        }

        ClientHolder holder = _clientHolder.Value;
        DateTime expiresUtc = _clock.UtcNow.ToUniversalTime().Add(ttl).UtcDateTime;

        GetPreSignedUrlRequest request = new()
        {
            BucketName = _options.Bucket,
            Key = normalizedKey,
            Verb = HttpVerb.GET,
            Expires = expiresUtc,
            Protocol = holder.PresignProtocol,
        };

        if (!string.IsNullOrWhiteSpace(downloadName))
        {
            request.ResponseHeaderOverrides = new ResponseHeaderOverrides
            {
                ContentDisposition = BuildAttachmentContentDisposition(downloadName),
            };
        }

        return await holder.Client.GetPreSignedURLAsync(request).ConfigureAwait(false);
    }

    public async Task Delete(string key, CancellationToken ct = default)
    {
        string normalizedKey = NormalizeObjectKey(key, nameof(key));
        ClientHolder holder = _clientHolder.Value;

        await holder.Client.DeleteObjectAsync(_options.Bucket, normalizedKey, ct).ConfigureAwait(false);
    }

    public async Task DeleteByPrefix(string prefix, CancellationToken ct = default)
    {
        string normalizedPrefix = NormalizeObjectKey(prefix, nameof(prefix));
        ClientHolder holder = _clientHolder.Value;
        string? continuationToken = null;

        do
        {
            ListObjectsV2Request listRequest = new()
            {
                BucketName = _options.Bucket,
                Prefix = normalizedPrefix,
                ContinuationToken = continuationToken,
            };

            ListObjectsV2Response listResponse = await holder.Client
                .ListObjectsV2Async(listRequest, ct)
                .ConfigureAwait(false);

            if (listResponse.S3Objects is { Count: > 0 })
            {
                DeleteObjectsRequest deleteRequest = new()
                {
                    BucketName = _options.Bucket,
                    Quiet = true,
                    Objects = listResponse.S3Objects
                        .Select(obj => new KeyVersion { Key = obj.Key })
                        .ToList(),
                };

                DeleteObjectsResponse deleteResponse = await holder.Client
                    .DeleteObjectsAsync(deleteRequest, ct)
                    .ConfigureAwait(false);

                if (deleteResponse.DeleteErrors is { Count: > 0 })
                {
                    string failedKeys = string.Join(", ", deleteResponse.DeleteErrors.Select(e => e.Key));
                    throw new InvalidOperationException(
                        $"Failed to delete S3 objects under prefix '{normalizedPrefix}': {failedKeys}");
                }
            }

            continuationToken = listResponse.IsTruncated == true ? listResponse.NextContinuationToken : null;
        }
        while (!string.IsNullOrEmpty(continuationToken));
    }

    public void Dispose()
    {
        if (_ownsClient && _clientHolder.IsValueCreated && _clientHolder.Value.Client is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }

    private static ClientHolder CreateClient(S3Options options)
    {
        ValidateBucket(options.Bucket);

        if (string.IsNullOrWhiteSpace(options.AccessKey) || string.IsNullOrWhiteSpace(options.SecretKey))
        {
            throw new InvalidOperationException(
                "S3 credentials are not configured. Set S3:AccessKey and S3:SecretKey (or S3__AccessKey / S3__SecretKey).");
        }

        string region = string.IsNullOrWhiteSpace(options.Region) ? "auto" : options.Region.Trim();

        AmazonS3Config config = new()
        {
            // Required for Cloudflare R2 and MinIO compatibility so presigned PUT URLs
            // from browser XHR do not require SDK trailing checksum headers.
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        };

        Protocol presignProtocol = Protocol.HTTPS;

        if (!string.IsNullOrWhiteSpace(options.Endpoint))
        {
            if (!Uri.TryCreate(options.Endpoint.Trim(), UriKind.Absolute, out Uri? endpointUri)
                || (!endpointUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                    && !endpointUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidOperationException(
                    $"Invalid S3:Endpoint '{options.Endpoint}'. Expected an absolute http or https URL.");
            }

            config.ServiceURL = endpointUri.ToString().TrimEnd('/');
            config.ForcePathStyle = options.ForcePathStyle;
            config.AuthenticationRegion = region;
            presignProtocol = endpointUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                ? Protocol.HTTP
                : Protocol.HTTPS;
        }
        else
        {
            string awsRegion = string.Equals(region, "auto", StringComparison.OrdinalIgnoreCase)
                ? "us-east-1"
                : region;
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(awsRegion);
        }

        BasicAWSCredentials credentials = new(options.AccessKey, options.SecretKey);
        AmazonS3Client client = new(credentials, config);
        return new ClientHolder(client, presignProtocol);
    }

    private static void ValidateBucket(string? bucket)
    {
        if (string.IsNullOrWhiteSpace(bucket))
        {
            throw new InvalidOperationException("S3:Bucket (or S3__Bucket) configuration is required.");
        }
    }

    private static string NormalizeObjectKey(string value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Object key or prefix cannot be empty.", paramName);
        }

        string normalized = value.Trim().TrimStart('/');
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Object key or prefix cannot consist only of slashes.", paramName);
        }

        return normalized;
    }

    private static bool IsNotFound(AmazonS3Exception ex)
        => ex.StatusCode == HttpStatusCode.NotFound
            || string.Equals(ex.ErrorCode, "NotFound", StringComparison.OrdinalIgnoreCase)
            || string.Equals(ex.ErrorCode, "NoSuchKey", StringComparison.OrdinalIgnoreCase);

    private static string BuildAttachmentContentDisposition(string downloadName)
    {
        string sanitized = downloadName
            .Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", string.Empty, StringComparison.Ordinal)
            .Trim();

        if (string.IsNullOrWhiteSpace(sanitized))
        {
            return "attachment";
        }

        char[] asciiBuffer = new char[sanitized.Length];
        for (int i = 0; i < sanitized.Length; i++)
        {
            char ch = sanitized[i];
            asciiBuffer[i] = ch is >= ' ' and <= '~' and not '"' and not '\\' ? ch : '_';
        }

        string asciiFallback = new(asciiBuffer);
        return $"attachment; filename=\"{asciiFallback}\"; filename*=UTF-8''{Uri.EscapeDataString(sanitized)}";
    }

    private sealed record ClientHolder(IAmazonS3 Client, Protocol PresignProtocol);
}

