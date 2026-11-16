using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Learning.Domain.Entities;

public class QuizAttemptAnswer : Entity
{
    private QuizAttemptAnswer() { }

    public QuizAttemptAnswer(
        Guid id,
        Guid attemptId,
        Guid questionId,
        int questionPosition,
        decimal maxPoints,
        string? answerPayload = null)
        : base(id)
    {
        AttemptId = attemptId;
        QuestionId = questionId;
        QuestionPosition = questionPosition;
        MaxPoints = maxPoints;
        AnswerPayload = answerPayload;
    }

    public Guid AttemptId { get; private set; }
    public Guid QuestionId { get; private set; }
    public int QuestionPosition { get; private set; }
    public string? AnswerPayload { get; private set; }
    public bool? IsCorrect { get; private set; }
    public decimal? PointsEarned { get; private set; }
    public decimal MaxPoints { get; private set; }
    public DateTimeOffset? AnsweredAt { get; private set; }
    public DateTimeOffset? GradedAt { get; private set; }
    public Guid? GradedByUserId { get; private set; }
    public string? GraderFeedback { get; private set; }

    public void SaveAnswer(string answerPayload, DateTimeOffset answeredAt)
    {
        AnswerPayload = answerPayload;
        AnsweredAt = answeredAt;
    }

    public void SetGrade(decimal pointsEarned, bool isCorrect, DateTimeOffset gradedAt, Guid? gradedByUserId = null, string? graderFeedback = null)
    {
        PointsEarned = pointsEarned;
        IsCorrect = isCorrect;
        GradedAt = gradedAt;
        if (gradedByUserId.HasValue) GradedByUserId = gradedByUserId;
        if (graderFeedback != null) GraderFeedback = graderFeedback;
    }
}
