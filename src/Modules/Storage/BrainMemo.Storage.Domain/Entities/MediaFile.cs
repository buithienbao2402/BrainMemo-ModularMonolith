namespace BrainMemo.Storage.Domain.Entities;

public enum MediaStatus
{
    PENDING,
    CONFIRMED
}

public class MediaFile
{
    public long MediaId { get; set; }
    public long OwnerId { get; set; }
    public string ObjectKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public MediaStatus Status { get; set; } = MediaStatus.PENDING;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
