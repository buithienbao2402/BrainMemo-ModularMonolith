using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public sealed class CourseCompletion : Entity
{
    private CourseCompletion()
    {
    }

    public CourseCompletion(
        Guid id,
        Guid userId,
        Guid courseId,
        DateTimeOffset completedAt)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        CompletedAt = completedAt;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public DateTimeOffset CompletedAt { get; private set; }
}
