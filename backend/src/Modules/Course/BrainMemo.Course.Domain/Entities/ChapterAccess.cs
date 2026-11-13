using BrainMemo.Course.Domain.Enums;

namespace BrainMemo.Course.Domain.Entities;

public sealed class ChapterAccess
{
    private ChapterAccess()
    {
    }

    public ChapterAccess(
        Guid chapterId,
        Guid courseId,
        ChapterAccessMode accessMode,
        string? passcodeHash,
        uint passcodeVersion,
        DateTimeOffset updatedAt)
    {
        ChapterId = chapterId;
        CourseId = courseId;
        AccessMode = accessMode;
        PasscodeHash = passcodeHash;
        PasscodeVersion = passcodeVersion;
        UpdatedAt = updatedAt;
    }

    public Guid ChapterId { get; private set; }
    public Guid CourseId { get; private set; }
    public ChapterAccessMode AccessMode { get; private set; }
    public string? PasscodeHash { get; private set; }
    public uint PasscodeVersion { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateAccess(ChapterAccessMode accessMode, string? passcodeHash, DateTimeOffset now)
    {
        AccessMode = accessMode;
        if (accessMode == ChapterAccessMode.Protected)
        {
            PasscodeHash = passcodeHash;
            PasscodeVersion++;
        }
        else
        {
            PasscodeHash = null;
        }

        UpdatedAt = now;
    }
}
