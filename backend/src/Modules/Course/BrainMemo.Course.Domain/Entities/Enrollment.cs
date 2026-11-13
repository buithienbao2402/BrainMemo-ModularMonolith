using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Course.Domain.Entities;

public sealed class Enrollment : Entity<Guid>
{
    private Enrollment() { }

    public Enrollment(
        Guid id,
        Guid courseId,
        Guid userId,
        EnrollmentStatus status,
        DateTimeOffset utcNow) : base(id)
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
        Status = status;
        FirstEnrolledAt = status == EnrollmentStatus.Active ? utcNow : null;
        StatusChangedAt = utcNow;
        CreatedAt = utcNow;
        UpdatedAt = utcNow;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public EnrollmentStatus Status { get; private set; }
    public DateTimeOffset? FirstEnrolledAt { get; private set; }
    public DateTimeOffset StatusChangedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void ChangeStatus(EnrollmentStatus newStatus, DateTimeOffset utcNow)
    {
        if (Status == newStatus)
        {
            return;
        }

        Status = newStatus;
        StatusChangedAt = utcNow;
        UpdatedAt = utcNow;

        if (newStatus == EnrollmentStatus.Active && FirstEnrolledAt == null)
        {
            FirstEnrolledAt = utcNow;
        }
    }
}
