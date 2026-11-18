using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public class QuizAttempt : AggregateRoot
{
    private QuizAttempt() { }

    public QuizAttempt(
        Guid id,
        Guid userId,
        Guid courseId,
        Guid quizBlockId,
        int attemptNo,
        DateTimeOffset deadlineAt,
        decimal maxScore,
        string questionSnapshot,
        DateTimeOffset? startedAt = null)
        : base(id)
    {
        UserId = userId;
        CourseId = courseId;
        QuizBlockId = quizBlockId;
        AttemptNo = attemptNo;
        Status = "IN_PROGRESS";
        StartedAt = startedAt ?? DateTimeOffset.UtcNow;
        DeadlineAt = deadlineAt;
        MaxScore = maxScore;
        QuestionSnapshot = questionSnapshot;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid UserId { get; private set; }
    public Guid CourseId { get; private set; }
    public Guid QuizBlockId { get; private set; }
    public int AttemptNo { get; private set; }
    public string Status { get; private set; } = "IN_PROGRESS";
    public DateTimeOffset StartedAt { get; private set; }
    public DateTimeOffset DeadlineAt { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset? GradedAt { get; private set; }
    public decimal? TotalScore { get; private set; }
    public decimal MaxScore { get; private set; }
    public string QuestionSnapshot { get; private set; } = "[]";
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsExpired(DateTimeOffset now) => Status == "IN_PROGRESS" && now > DeadlineAt;

    public void Submit(DateTimeOffset submittedAt, bool autoSubmitted = false)
    {
        if (Status != "IN_PROGRESS")
        {
            return;
        }

        Status = autoSubmitted ? "AUTO_SUBMITTED" : "SUBMITTED";
        SubmittedAt = submittedAt;
    }

    public void ApplyGrading(decimal totalScore, DateTimeOffset gradedAt)
    {
        TotalScore = totalScore;
        GradedAt = gradedAt;
        Status = "GRADED";
    }
}
