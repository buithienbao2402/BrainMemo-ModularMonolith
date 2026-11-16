namespace BrainMemo.Learning.Contracts.Dtos;

public sealed record CourseProgressDto(
    Guid CourseId,
    double Percent,
    IReadOnlyList<Guid> CompletedChapterIds,
    IReadOnlyList<ChapterProgressDto> Chapters,
    IReadOnlyList<Guid> CompletedBlockIds,
    DateTimeOffset? LastActivityAt,
    DateTimeOffset? CourseCompletedAt);

public sealed record ChapterProgressDto(
    Guid ChapterId,
    double Percent);

public sealed record LearnChapterDto(
    Guid Id,
    string Title,
    string? Description,
    int VersionNo,
    bool CanSaveProgress,
    IReadOnlyList<LearnBlockDto> Blocks);

public sealed record LearnBlockDto(
    Guid Id,
    string BlockType,
    int Position,
    bool Completed,
    string? Title = null,
    string? Body = null,
    string? ResourceUrl = null,
    object? Flashcards = null,
    object? Question = null,
    object? QuizSummary = null,
    object? AssignmentSummary = null);

public sealed record BookmarkDto(
    Guid CourseId,
    string CourseName,
    Guid ChapterId,
    string ChapterTitle,
    DateTimeOffset UpdatedAt);

public sealed record QuizAttemptSummaryDto(
    Guid AttemptId,
    Guid QuizBlockId,
    Guid UserId,
    string Status,
    double? TotalScore,
    double MaxScore,
    DateTimeOffset StartedAt,
    DateTimeOffset? SubmittedAt);

public sealed record AttemptForGradingDto(
    Guid AttemptId,
    Guid CourseId,
    Guid QuizBlockId,
    Guid UserId,
    decimal? PassScorePercent,
    IReadOnlyList<GradingQuestionItemDto> Questions);

public sealed record GradingQuestionItemDto(
    Guid QuestionId,
    int Position,
    string QuestionType,
    bool AllowMultiple,
    decimal MaxPoints,
    IReadOnlyList<GradingOptionItemDto> Options,
    string? ReferenceAnswer,
    GradingAnswerPayloadDto? StudentAnswer);

public sealed record GradingOptionItemDto(
    Guid Id,
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool IsCorrect);

public sealed record GradingAnswerPayloadDto(
    IReadOnlyList<Guid>? SelectedOptionIds,
    string? TextAnswer,
    IReadOnlyDictionary<Guid, string>? Matches);

public sealed record AssignmentSubmissionDto(
    Guid SubmissionId,
    Guid CourseId,
    Guid AssignmentBlockId,
    Guid UserId,
    string Status,
    DateTimeOffset? SubmittedAt);

public sealed record ReportTargetDto(
    Guid CommentId,
    Guid CourseId,
    Guid? ChapterId,
    Guid AuthorUserId,
    string Content);

public sealed record CourseLearningStatsDto(
    int CompletedLearnerCount,
    int CommentCount);

public sealed record ManualGrade(
    Guid QuestionId,
    decimal Points,
    string? Feedback);

public sealed record ChapterProgressSummaryDto(
    Guid ChapterId,
    int CompletedLearnerCount,
    double CompletionRate);

public sealed record CourseEnrollmentSummaryDto(
    Guid CourseId,
    int TotalLearners,
    int ActiveLearners,
    int CompletedLearners,
    int PendingApprovalCount,
    int InvitedCount,
    int LeftCount,
    int RemovedCount);
