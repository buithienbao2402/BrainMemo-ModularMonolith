namespace BrainMemo.Learning.Application.DTOs;

public sealed record QuizAttemptDto(
    Guid Id,
    Guid QuizBlockId,
    Guid CourseId,
    int AttemptNo,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset DeadlineAt,
    DateTimeOffset? SubmittedAt,
    decimal? TotalScore,
    decimal MaxScore,
    IReadOnlyList<QuizQuestionDto> Questions);

public sealed record QuizQuestionDto(
    Guid Id,
    int Position,
    string QuestionType,
    string Stem,
    decimal MaxPoints,
    bool AllowMultiple,
    IReadOnlyList<QuizOptionDto> Options,
    string? Explanation,
    string? ReferenceAnswer,
    QuizStudentAnswerDto? StudentAnswer);

public sealed record QuizOptionDto(
    Guid Id,
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool? IsCorrect);

public sealed record QuizStudentAnswerDto(
    IReadOnlyList<Guid>? SelectedOptionIds,
    string? TextAnswer,
    IReadOnlyDictionary<Guid, string>? Matches,
    bool? IsCorrect,
    decimal? PointsEarned,
    DateTimeOffset? AnsweredAt);

public sealed record SaveAnswerResultDto(
    DateTimeOffset SavedAt,
    bool? IsCorrect,
    decimal? PointsEarned);

public sealed record QuizSubmitResultDto(
    Guid AttemptId,
    string Status,
    decimal? TotalScore,
    decimal MaxScore,
    bool? IsPassed);
