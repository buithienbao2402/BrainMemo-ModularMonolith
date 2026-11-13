namespace BrainMemo.Course.Domain.Entities;

public sealed class CourseTag
{
    private CourseTag() { }

    public CourseTag(Guid courseId, string tag)
    {
        if (courseId == Guid.Empty)
        {
            throw new ArgumentException("Course ID cannot be empty.", nameof(courseId));
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(tag);

        CourseId = courseId;
        Tag = tag.Trim();
    }

    public Guid CourseId { get; private set; }
    public string Tag { get; private set; } = string.Empty;
}
