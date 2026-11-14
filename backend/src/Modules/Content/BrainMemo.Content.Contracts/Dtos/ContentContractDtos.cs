using BrainMemo.SharedKernel;

namespace BrainMemo.Content.Contracts.Dtos;

public sealed record ChapterInfoDto(
    Guid Id,
    Guid CourseId,
    int Position,
    string Title,
    string? Description,
    string Status,
    int LastVersionNo,
    int? PublishedVersionNo,
    DateTimeOffset? FirstPublishedAt,
    DateTimeOffset? LastPublishedAt);

public sealed record PublishedChapterContentDto(
    Guid ChapterId,
    Guid CourseId,
    int VersionNo,
    string Title,
    string? Description,
    IReadOnlyList<PublishedBlockRef> Blocks);

public sealed record PublishedBlockRef(
    Guid BlockId,
    Guid ChapterId,
    string BlockType,
    int Position,
    Guid? ResourceId,
    Guid? QuestionId,
    int VersionNo);

public sealed record AssessableBlockDto(
    Guid BlockId,
    Guid CourseId,
    Guid ChapterId,
    string BlockType,
    string Title,
    decimal? MaxScore);

public sealed record QuizDefinitionDto(
    Guid QuizBlockId,
    decimal? PassScore,
    bool HasPassword,
    string ResultDisplay,
    int? TimeLimitMinutes,
    int? MaxAttempts,
    bool ShuffleQuestions,
    bool ShuffleOptions);

public sealed record QuizExceptionDto(
    Guid UserId,
    int? ExtraMinutes,
    int? ExtraAttempts,
    DateTimeOffset? ExtendedCloseAt);

public sealed record DrawnQuizDto(
    Guid QuizBlockId,
    IReadOnlyList<Guid> QuestionIds);

public sealed record AssignmentDefinitionDto(
    Guid AssignmentBlockId,
    DateTimeOffset? DueAt,
    decimal? MaxPoints,
    int MaxFileSizeBytes);

public sealed record QuestionDetailDto(
    Guid Id,
    string QuestionType,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    int? DifficultyCode,
    decimal DefaultPoints,
    IReadOnlyList<QuestionOptionDto> Options);

public sealed record QuestionOptionDto(
    Guid Id,
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool? IsCorrect);

public sealed record PracticeQuestionDto(
    Guid BlockId,
    Guid QuestionId,
    string QuestionType,
    string Stem,
    IReadOnlyList<PracticeOptionDto> Options);

public sealed record PracticeOptionDto(
    Guid Id,
    int Position,
    string Content);

public sealed record PracticeResultDto(
    bool IsCorrect,
    string? Explanation,
    decimal EarnedPoints);

public sealed record ResourceAuthDto(
    Guid ResourceId,
    string StorageKey,
    string ContentType,
    long SizeBytes,
    string OriginalFilename);

public sealed record AiQuestionItem(
    int ItemNo,
    string QuestionType,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    decimal DefaultPoints,
    IReadOnlyList<string> Tags,
    IReadOnlyList<AiQuestionOptionItem> Options);

public sealed record AiQuestionOptionItem(
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool IsCorrect);

public sealed record Flashcard(
    string Front,
    string Back);

public sealed record AnswerPayload(
    IReadOnlyList<Guid>? SelectedOptionIds,
    string? TextAnswer,
    IReadOnlyDictionary<Guid, string>? Matches);

public sealed record ResourceDto(
    Guid Id,
    string Kind,
    string OriginalFilename,
    string ContentType,
    long SizeBytes,
    DateTimeOffset CreatedAt);

public sealed record ChapterSummaryDto(
    Guid Id,
    int Position,
    string Title,
    string? Description,
    string Status,
    string AccessMode,
    bool HasUnpublishedChanges);

public sealed record ChapterVersionDto(
    int VersionNo,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt,
    int? RestoredFromVersionNo);

public sealed record ChapterDetailDto(
    Guid Id,
    Guid CourseId,
    int Position,
    string Title,
    string? Description,
    string Status,
    int LastVersionNo,
    int? PublishedVersionNo,
    IReadOnlyList<BlockDto> Blocks);

public sealed record BlockDto(
    Guid Id,
    string BlockType,
    int Position,
    string? Title,
    string? Body,
    Guid? ResourceId,
    Guid? QuestionId,
    IReadOnlyList<Flashcard>? Flashcards,
    string AiReviewStatus,
    QuizConfigDto? QuizConfig,
    AssignmentConfigDto? AssignmentConfig);

public sealed record QuizConfigDto(
    DateTimeOffset? OpenAt,
    DateTimeOffset? CloseAt,
    int? TimeLimitMinutes,
    int? MaxAttempts,
    decimal? PassScore,
    string ResultDisplay,
    bool ShuffleQuestions,
    bool ShuffleOptions,
    string? Password,
    bool HasPassword,
    IReadOnlyList<QuizQuestionItemDto>? Questions,
    IReadOnlyList<QuizRandomRuleDto>? RandomRules,
    IReadOnlyList<QuizPrerequisiteDto>? Prerequisites);

public sealed record QuizQuestionItemDto(
    Guid QuestionId,
    int Position,
    decimal Points);

public sealed record QuizRandomRuleDto(
    int Position,
    int PickCount,
    decimal PointsEach,
    string? FilterTag,
    int? FilterDifficultyCode,
    string? FilterQuestionType);

public sealed record QuizPrerequisiteDto(
    string TargetKind,
    Guid TargetId);

public sealed record AssignmentConfigDto(
    DateTimeOffset? DueAt,
    decimal? MaxPoints,
    int MaxFileSizeBytes);
