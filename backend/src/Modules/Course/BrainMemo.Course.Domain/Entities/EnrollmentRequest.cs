using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Course.Domain.Entities;

public sealed class EnrollmentRequest : Entity
{
    private EnrollmentRequest()
    {
    }

    public EnrollmentRequest(
        Guid id,
        Guid courseId,
        Guid userId,
        DateTimeOffset requestedAt)
        : base(id)
    {
        CourseId = courseId;
        UserId = userId;
        Decision = EnrollmentDecision.Pending;
        RequestedAt = requestedAt;
    }

    public Guid CourseId { get; private set; }
    public Guid UserId { get; private set; }
    public EnrollmentDecision Decision { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }
    public DateTimeOffset? DecidedAt { get; private set; }
    public Guid? DecidedByUserId { get; private set; }

    public void Decide(EnrollmentDecision decision, Guid decidedByUserId, DateTimeOffset decidedAt)
    {
        Decision = decision;
        DecidedByUserId = decidedByUserId;
        DecidedAt = decidedAt;
    }
}
