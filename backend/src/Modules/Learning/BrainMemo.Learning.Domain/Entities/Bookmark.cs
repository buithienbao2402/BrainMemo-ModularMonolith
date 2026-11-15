using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public sealed class Bookmark : Entity
{
    private Bookmark()
    {
    }

    public Bookmark(
        Guid id,
        Guid userId,
        Guid courseId,
        Guid chapterId,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        ChapterId = chapterId;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public Guid ChapterId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateChapter(Guid chapterId, DateTimeOffset updatedAt)
    {
        ChapterId = chapterId;
        UpdatedAt = updatedAt;
    }
}
