using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class QuizException : Entity
{
    private QuizException() { }

    public QuizException(
        Guid id,
        Guid courseId,
        Guid quizBlockId,
        Guid userId,
        ushort? extraMinutes = null,
        ushort? extraAttempts = null,
        DateTimeOffset? extendedCloseAt = null)
        : base(id)
    {
        CourseId = courseId;
        QuizBlockId = quizBlockId;
        UserId = userId;
        ExtraMinutes = extraMinutes;
        ExtraAttempts = extraAttempts;
        ExtendedCloseAt = extendedCloseAt;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public Guid QuizBlockId { get; private set; }
    public Guid UserId { get; private set; }
    public ushort? ExtraMinutes { get; private set; }
    public ushort? ExtraAttempts { get; private set; }
    public DateTimeOffset? ExtendedCloseAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        ushort? extraMinutes,
        ushort? extraAttempts,
        DateTimeOffset? extendedCloseAt)
    {
        ExtraMinutes = extraMinutes;
        ExtraAttempts = extraAttempts;
        ExtendedCloseAt = extendedCloseAt;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
