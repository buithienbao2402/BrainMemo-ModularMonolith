using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class ChapterVersion : Entity
{
    private ChapterVersion() { }

    public ChapterVersion(
        Guid id,
        Guid chapterId,
        int versionNo,
        string snapshot,
        int? restoredFromVersionNo = null)
        : base(id)
    {
        if (id == Guid.Empty) throw new ArgumentException("Version id cannot be empty", nameof(id));
        if (chapterId == Guid.Empty) throw new ArgumentException("Chapter id cannot be empty", nameof(chapterId));
        if (versionNo <= 0) throw new ArgumentOutOfRangeException(nameof(versionNo), "Version number must be positive");
        if (string.IsNullOrWhiteSpace(snapshot)) throw new ArgumentException("Snapshot cannot be empty", nameof(snapshot));

        ChapterId = chapterId;
        VersionNo = versionNo;
        Snapshot = snapshot;
        RestoredFromVersionNo = restoredFromVersionNo;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid ChapterId { get; private set; }
    public int VersionNo { get; private set; }
    public string Snapshot { get; private set; } = string.Empty;
    public int? RestoredFromVersionNo { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? PublishedAt { get; private set; }

    public void MarkPublished(DateTimeOffset publishedAt)
    {
        PublishedAt = publishedAt;
    }
}
