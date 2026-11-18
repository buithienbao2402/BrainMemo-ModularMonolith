namespace BrainMemo.Discovery.Domain.Entities;

public sealed class CourseEntry
{
    public Guid CourseId { get; set; }
    public Guid OwnerUserId { get; set; }
    public string OwnerDisplayName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverStorageKey { get; set; }
    public string AccessMode { get; set; } = "PUBLIC";
    public string CourseStatus { get; set; } = "UPDATING";
    public IReadOnlyList<string>? TagList { get; set; }
    public int LearnerCount { get; set; }
    public int ReviewCount { get; set; }
    public decimal? AvgRating { get; set; }
    public int NominationCount { get; set; }
    public int CommentCount { get; set; }
    public int PublishedChapterCount { get; set; }
    public DateTimeOffset LastUpdatedAt { get; set; }
    public DateTimeOffset? FirstPublishedAt { get; set; }
    public uint SourceRevision { get; set; }
    public DateTimeOffset SyncedAt { get; set; } = DateTimeOffset.UtcNow;
}
