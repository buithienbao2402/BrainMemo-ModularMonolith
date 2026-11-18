namespace BrainMemo.Learning.Application.DTOs;

public sealed record SubmissionDto(
    Guid Id,
    string Status,
    string? TextContent,
    IReadOnlyList<SubmissionFileRefDto>? Files,
    bool? IsLate,
    DateTimeOffset? SubmittedAt,
    decimal? Score,
    string? Feedback);

public sealed record SubmissionFileRefDto(
    string StorageKey,
    string OriginalFilename,
    long SizeBytes,
    string ContentType);

public sealed record SubmissionUpsertDto(
    string? TextContent,
    IReadOnlyList<string>? FileUploadKeys = null,
    IReadOnlyList<string>? RemoveFileKeys = null);

public sealed record PendingSubmissionItemDto(
    Guid Id,
    Guid CourseId,
    Guid AssignmentBlockId,
    Guid UserId,
    string Status,
    bool? IsLate,
    DateTimeOffset? SubmittedAt);
