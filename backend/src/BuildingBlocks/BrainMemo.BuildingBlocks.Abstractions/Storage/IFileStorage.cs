namespace BrainMemo.BuildingBlocks.Abstractions.Storage;

public sealed record PresignedUpload(
    string UploadKey,
    string UploadUrl,
    DateTimeOffset ExpiresAt,
    IReadOnlyDictionary<string, string>? Headers = null);

public sealed record FileHead(
    long Size,
    string ContentType,
    string? ETag = null);

/// <summary>
/// S3-compatible object storage port implemented by S3FileStorage for Cloudflare R2 and MinIO (DEC-05, DEC-06, DEC-18).
/// </summary>
public interface IFileStorage
{
    Task<PresignedUpload> CreateUploadUrl(
        string tmpKey,
        string contentType,
        long maxBytes,
        TimeSpan ttl,
        CancellationToken ct = default);

    Task<FileHead?> Head(string key, CancellationToken ct = default);

    Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default);

    Task<string> CreateDownloadUrl(
        string key,
        TimeSpan ttl,
        string? downloadName = null,
        CancellationToken ct = default);

    Task Delete(string key, CancellationToken ct = default);

    Task DeleteByPrefix(string prefix, CancellationToken ct = default);
}
