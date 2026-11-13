using BrainMemo.Course.Domain.Enums;

namespace BrainMemo.Course.Domain.Entities;

public sealed class ChapterAccess
{
    private ChapterAccess() { }

    public ChapterAccess(
        Guid chapterId,
        Guid courseId,
        ChapterAccessMode accessMode,
        string? passcodeHash,
        DateTimeOffset utcNow)
    {
        if (chapterId == Guid.Empty)
        {
            throw new ArgumentException("Chapter ID cannot be empty.", nameof(chapterId));
        }

        if (courseId == Guid.Empty)
        {
            throw new ArgumentException("Course ID cannot be empty.", nameof(courseId));
        }

        ChapterId = chapterId;
        CourseId = courseId;
        AccessMode = accessMode;
        PasscodeHash = accessMode == ChapterAccessMode.Protected ? passcodeHash : null;
        PasscodeVersion = accessMode == ChapterAccessMode.Protected ? 1 : 0;
        UpdatedAt = utcNow;
    }

    public Guid ChapterId { get; private set; }
    public Guid CourseId { get; private set; }
    public ChapterAccessMode AccessMode { get; private set; }
    public string? PasscodeHash { get; private set; }
    public int PasscodeVersion { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void SetPublic(DateTimeOffset utcNow)
    {
        AccessMode = ChapterAccessMode.Public;
        PasscodeHash = null;
        UpdatedAt = utcNow;
    }

    public void SetProtected(string passcodeHash, DateTimeOffset utcNow)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passcodeHash);

        AccessMode = ChapterAccessMode.Protected;
        PasscodeHash = passcodeHash;
        PasscodeVersion++;
        UpdatedAt = utcNow;
    }
}
