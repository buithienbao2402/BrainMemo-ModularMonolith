using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Enrollment : Entity
{
    private Enrollment()
    {
    }

    public Enrollment(
        Guid id,
        Guid courseId,
        Guid userId,
        EnrollmentStatus status,
        DateTimeOffset? firstEnrolledAt,
        DateTimeOffset now)
        : base(id)
    {
        CourseId = courseId;
        UserId = userId;
        Status = status;
        FirstEnrolledAt = firstEnrolledAt;
        StatusChangedAt = now;
        CreatedAt = now;
        UpdatedAt = now;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public EnrollmentStatus Status { get; private set; }
    public DateTimeOffset? FirstEnrolledAt { get; private set; }
    public DateTimeOffset StatusChangedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void ChangeStatus(EnrollmentStatus newStatus, DateTimeOffset now)
    {
        if (Status == newStatus)
        {
            return;
        }

        if (newStatus == EnrollmentStatus.Active && FirstEnrolledAt == null)
        {
            FirstEnrolledAt = now;
        }

        Status = newStatus;
        StatusChangedAt = now;
        UpdatedAt = now;
    }
}
