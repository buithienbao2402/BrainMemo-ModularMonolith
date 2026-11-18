using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class GradeRecord : AggregateRoot
{
    private GradeRecord() { }

    public GradeRecord(
        Guid id,
        Guid userId,
        Guid courseId,
        Guid componentId,
        GradeRecordType recordType,
        Guid? sourceAttemptId,
        Guid? sourceSubmissionId,
        decimal? score,
        decimal? maxScore,
        bool isFullyGraded,
        DateTimeOffset? gradedAt,
        string? feedback = null)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        ComponentId = componentId;
        RecordType = recordType;
        SourceAttemptId = sourceAttemptId;
        SourceSubmissionId = sourceSubmissionId;
        Score = score;
        MaxScore = maxScore;
        IsFullyGraded = isFullyGraded;
        GradedAt = gradedAt;
        Feedback = feedback;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public Guid ComponentId { get; private set; }
    public GradeRecordType RecordType { get; private set; }
    public Guid? SourceAttemptId { get; private set; }
    public Guid? SourceSubmissionId { get; private set; }
    public decimal? Score { get; private set; }
    public decimal? MaxScore { get; private set; }
    public bool IsFullyGraded { get; private set; }
    public DateTimeOffset? GradedAt { get; private set; }
    public string? Feedback { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateScore(decimal? score, decimal? maxScore, bool isFullyGraded, DateTimeOffset? gradedAt, string? feedback = null)
    {
        Score = score;
        MaxScore = maxScore;
        IsFullyGraded = isFullyGraded;
        GradedAt = gradedAt;
        if (feedback != null) Feedback = feedback;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
