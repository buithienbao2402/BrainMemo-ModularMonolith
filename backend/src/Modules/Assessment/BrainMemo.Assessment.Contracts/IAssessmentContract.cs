using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Contracts;

public interface IAssessmentContract
{
    Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId);
    Result RecordAssignmentSubmission(Guid submissionId, Guid courseId, Guid userId, Guid blockId, DateTimeOffset submittedAt);
    Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds);
    Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId);
    Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId);
}

public sealed record GradeQuizAttemptResult(
    decimal TotalScore,
    decimal MaxScore,
    bool PendingManual,
    decimal? PassScorePercent,
    bool? IsPassed,
    IReadOnlyList<QuestionGrade> Questions);

public sealed record QuestionGrade(
    Guid QuestionId,
    decimal? PointsEarned,
    bool? IsCorrect);

public sealed record QuestionUsageDto(
    Guid QuestionId,
    int QuizCount,
    int AttemptCount,
    decimal? CorrectRate);

public sealed record GradebookDto(
    Guid UserId,
    Guid CourseId,
    IReadOnlyList<GradeItemDto> Items,
    decimal? FinalScore,
    bool? IsPassed);

public sealed record GradeItemDto(
    Guid ItemId,
    string ItemName,
    string ItemKind,
    decimal? Score,
    decimal? MaxScore,
    bool IsGraded);

public sealed record CloStatDto(
    Guid CloId,
    string Code,
    string Description,
    decimal AttainmentRate);
