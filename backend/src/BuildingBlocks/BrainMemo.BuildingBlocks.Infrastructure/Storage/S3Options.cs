namespace BrainMemo.BuildingBlocks.Infrastructure.Storage;

/// <summary>
/// Configuration options for S3-compatible object storage (Cloudflare R2 in prod, MinIO in dev).
/// Maps directly to environment variables S3__* in infra/env/.env.example.
/// </summary>
public sealed class S3Options
{
    public const string SectionName = "S3";

    public string Endpoint { get; set; } = string.Empty;

    public string AccessKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    public string Bucket { get; set; } = "brainmemo-media";

    public string Region { get; set; } = "auto";

    public bool ForcePathStyle { get; set; } = true;

    public int UploadUrlTtlMinutes { get; set; } = 15;

    public int DownloadUrlTtlMinutes { get; set; } = 15;

    public TimeSpan GetUploadUrlTtl()
        => TimeSpan.FromMinutes(Math.Clamp(UploadUrlTtlMinutes, 1, 1440));

    public TimeSpan GetDownloadUrlTtl()
        => TimeSpan.FromMinutes(Math.Clamp(DownloadUrlTtlMinutes, 1, 1440));
}

