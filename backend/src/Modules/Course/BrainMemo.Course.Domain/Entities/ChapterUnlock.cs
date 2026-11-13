namespace BrainMemo.Course.Domain.Entities;

public sealed class ChapterUnlock
{
    private ChapterUnlock()
    {
    }

    public ChapterUnlock(Guid chapterId, Guid userId, uint passcodeVersion, DateTimeOffset unlockedAt)
    {
        ChapterId = chapterId;
        UserId = userId;
        PasscodeVersion = passcodeVersion;
        UnlockedAt = unlockedAt;
    }

    public Guid ChapterId { get; private set; }
    public Guid UserId { get; private set; }
    public uint PasscodeVersion { get; private set; }
    public DateTimeOffset UnlockedAt { get; private set; }
}
