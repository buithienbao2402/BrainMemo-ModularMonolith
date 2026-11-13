namespace BrainMemo.Course.Domain.Entities;

public sealed class ChapterUnlock
{
    private ChapterUnlock() { }

    public ChapterUnlock(
        Guid chapterId,
        Guid userId,
        int passcodeVersion,
        DateTimeOffset unlockedAt)
    {
        if (chapterId == Guid.Empty)
        {
            throw new ArgumentException("Chapter ID cannot be empty.", nameof(chapterId));
        }

        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        ChapterId = chapterId;
        UserId = userId;
        PasscodeVersion = passcodeVersion;
        UnlockedAt = unlockedAt;
    }

    public Guid ChapterId { get; private set; }
    public Guid UserId { get; private set; }
    public int PasscodeVersion { get; private set; }
    public DateTimeOffset UnlockedAt { get; private set; }

    public void RefreshVersion(int newVersion, DateTimeOffset utcNow)
    {
        PasscodeVersion = newVersion;
        UnlockedAt = utcNow;
    }
}
