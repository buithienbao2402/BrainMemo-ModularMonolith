using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Nomination : Entity<Guid>
{
    private Nomination() { }

    public Nomination(
        Guid id,
        Guid courseId,
        Guid userId,
        DateTimeOffset nominatedAt) : base(id)
    {
        if (courseId == Guid.Empty)
        {
            throw new ArgumentException("Course ID cannot be empty.", nameof(courseId));
        }

        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        CourseId = courseId;
        UserId = userId;
        NominatedAt = nominatedAt;
        ActiveMarker = 1;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTimeOffset NominatedAt { get; private set; }
    public DateTimeOffset? WithdrawnAt { get; private set; }
    public byte? ActiveMarker { get; private set; }

    public void Withdraw(DateTimeOffset withdrawnAt)
    {
        if (WithdrawnAt.HasValue)
        {
            return;
        }

        WithdrawnAt = withdrawnAt;
        ActiveMarker = null;
    }
}
