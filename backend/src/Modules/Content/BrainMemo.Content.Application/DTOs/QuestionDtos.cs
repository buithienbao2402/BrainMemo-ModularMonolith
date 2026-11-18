using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Content.Application.DTOs;

public sealed record QuestionBankDto(
    string? DifficultyScheme);

public sealed record SetDifficultySchemeRequest(
    string? DifficultyScheme);

public sealed record QuestionUpsertDto(
    string QuestionType,
    bool AllowMultiple,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    byte? DifficultyCode,
    decimal DefaultPoints,
    IReadOnlyList<string>? Tags,
    IReadOnlyList<QuestionOptionUpsertDto>? Options);

public sealed record QuestionOptionUpsertDto(
    Guid? Id,
    ushort Position,
    string Content,
    string? MatchContent,
    byte? BlankNo,
    bool IsCorrect);

public sealed record QuestionResponseDto(
    Guid Id,
    string QuestionType,
    bool AllowMultiple,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    byte? DifficultyCode,
    decimal DefaultPoints,
    string Status,
    string Origin,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<string> Tags,
    IReadOnlyList<QuestionOptionDto> Options);

public sealed record QuestionListResponseDto(
    IReadOnlyList<QuestionResponseDto> Items,
    PageMetaDto Meta);

public sealed record PageMetaDto(
    int Total,
    int Page,
    int PageSize);

public sealed record SetQuestionStatusRequest(
    string Status);

public sealed record QuestionUsageDto(
    IReadOnlyList<QuestionUsageQuizDto> Quizzes,
    int AttemptCount,
    decimal? CorrectRate);

public sealed record QuestionUsageQuizDto(
    Guid BlockId,
    string Title);

public sealed record ImportQuestionsResultDto(
    int Imported,
    IReadOnlyList<ImportRowErrorDto> Errors);

public sealed record ImportRowErrorDto(
    int Row,
    string Message);

public sealed record QuizExceptionUpsertDto(
    ushort? ExtraMinutes,
    ushort? ExtraAttempts,
    DateTimeOffset? ExtendedCloseAt);

public sealed record ChapterQuizSummaryDto(
    Guid BlockId,
    string Title,
    QuizConfigDto? QuizConfig,
    int QuestionCount);
