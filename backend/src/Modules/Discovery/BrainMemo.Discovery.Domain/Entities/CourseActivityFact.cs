namespace BrainMemo.Discovery.Domain.Entities;

public sealed class CourseActivityFact
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public Guid SourceEventId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
}
