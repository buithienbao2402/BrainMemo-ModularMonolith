namespace BrainMemo.Assessment.Application.DTOs;

public sealed record GradingQueueItemDto(
    string Kind,
    Guid SourceId,
    Guid BlockId,
    string BlockTitle,
    GradingLearnerRefDto Learner,
    DateTimeOffset? SubmittedAt);

public sealed record GradingLearnerRefDto(
    Guid Id,
    string DisplayName,
    string? Email);

public sealed record ManualQuestionGradeInput(
    Guid QuestionId,
    decimal Points,
    string? Feedback);

public sealed record GradeAttemptManuallyResultDto(
    decimal TotalScore,
    bool IsFullyGraded);

public sealed record GradingSubmissionDto(
    Guid Id,
    string Status,
    string? TextContent,
    IReadOnlyList<GradingFileRefDto>? Files,
    bool? IsLate,
    DateTimeOffset? SubmittedAt,
    decimal? Score,
    string? Feedback);

public sealed record GradingFileRefDto(
    string StorageKey,
    string OriginalFilename,
    long SizeBytes,
    string ContentType);

public sealed record AttemptReviewDto(
    Guid AttemptId,
    Guid CourseId,
    Guid QuizBlockId,
    Guid UserId,
    decimal? TotalScore,
    decimal MaxScore,
    bool IsFullyGraded,
    IReadOnlyList<AttemptReviewQuestionDto> Questions);

public sealed record AttemptReviewQuestionDto(
    Guid QuestionId,
    int Position,
    string QuestionType,
    string Stem,
    decimal MaxPoints,
    decimal? PointsEarned,
    string? ReferenceAnswer,
    string? StudentAnswerText,
    IReadOnlyList<Guid>? StudentSelectedOptionIds,
    string? Feedback);
