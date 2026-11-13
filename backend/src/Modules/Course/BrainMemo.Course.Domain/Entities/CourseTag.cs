namespace BrainMemo.Course.Domain.Entities;

public sealed class CourseTag
{
    private CourseTag()
    {
    }

    public CourseTag(Guid courseId, string tag)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tag);
        CourseId = courseId;
        Tag = tag.Trim().ToLowerInvariant();
    }

    public Guid CourseId { get; private set; }
    public string Tag { get; private set; } = string.Empty;
}
