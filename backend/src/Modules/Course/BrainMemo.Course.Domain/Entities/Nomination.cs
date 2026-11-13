using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Nomination : Entity
{
    private Nomination()
    {
    }

    public Nomination(
        Guid id,
        Guid courseId,
        Guid userId,
        DateTimeOffset nominatedAt)
        : base(id)
    {
        CourseId = courseId;
        UserId = userId;
        NominatedAt = nominatedAt;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTimeOffset NominatedAt { get; private set; }
    public DateTimeOffset? WithdrawnAt { get; private set; }

    public bool IsActive => !WithdrawnAt.HasValue;

    public void Withdraw(DateTimeOffset now)
    {
        WithdrawnAt = now;
    }
}
