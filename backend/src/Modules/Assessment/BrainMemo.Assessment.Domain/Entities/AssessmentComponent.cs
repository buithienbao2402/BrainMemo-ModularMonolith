using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class AssessmentComponent : AggregateRoot
{
    private AssessmentComponent() { }

    public AssessmentComponent(
        Guid id,
        Guid courseId,
        string sourceKind,
        Guid sourceBlockId,
        string title,
        decimal maxScore,
        decimal courseWeight)
        : base(id)
    {
        CourseId = courseId;
        SourceKind = sourceKind;
        SourceBlockId = sourceBlockId;
        Title = title;
        MaxScore = maxScore;
        CourseWeight = courseWeight;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public string SourceKind { get; private set; } = "QUIZ";
    public Guid SourceBlockId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public decimal MaxScore { get; private set; }
    public decimal CourseWeight { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(string title, decimal maxScore, decimal courseWeight)
    {
        Title = title;
        MaxScore = maxScore;
        CourseWeight = courseWeight;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
