namespace BrainMemo.Course.Contracts.Dtos;

public sealed record CourseAccessDto(
    bool Exists,
    string EffectiveState,
    string AccessMode,
    Guid OwnerUserId,
    bool IsOwner,
    string? EnrollmentStatus,
    bool CanViewInfo,
    bool CanReadContent,
    bool CanLearn,
    string ReasonCode);

public sealed record ChapterAccessResult(
    bool Allowed,
    bool CanSaveProgress,
    string Reason);

public sealed record CourseSummaryDto(
    Guid CourseId,
    string? Name,
    string? Description,
    string? CoverUrl,
    Guid OwnerUserId,
    string AccessMode,
    string Status,
    bool Visible,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ReportTargetDto(
    Guid CourseId,
    Guid OwnerUserId,
    string Name,
    string AccessMode,
    string Status);

public sealed record CourseSnapshotDto(
    Guid CourseId,
    Guid OwnerUserId,
    string Name,
    string? Description,
    string? CoverStorageKey,
    string AccessMode,
    string Status,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int Revision);

public sealed record EnrollmentFactDto(
    Guid CourseId,
    Guid UserId,
    DateTimeOffset OccurredAt);

public sealed record NominationFactDto(
    Guid CourseId,
    Guid UserId,
    string Action,
    DateTimeOffset OccurredAt);

public sealed record UserRefDto(
    Guid Id,
    string DisplayName,
    string? AvatarUrl);

public sealed record ViewerAccessDto(
    bool IsOwner,
    string? EnrollmentStatus,
    bool CanReadContent,
    bool CanLearn,
    bool HasNominated);

public sealed record CourseDto(
    Guid Id,
    UserRefDto Owner,
    string Name,
    string? Description,
    string? CoverUrl,
    string AccessMode,
    string Status,
    bool IsHidden,
    bool IsDeleted,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    ViewerAccessDto Viewer,
    double? RatingAvg,
    int RatingCount);

public sealed record CourseCardDto(
    Guid Id,
    string Name,
    string? CoverUrl,
    UserRefDto Owner,
    string AccessMode,
    string Status,
    IReadOnlyList<string> Tags,
    int LearnerCount,
    double? RatingAvg,
    int RatingCount,
    int NominationCount,
    double? ProgressPercent);

public sealed record CourseStatsDto(
    int ActiveLearners,
    int CompletedLearners,
    double CompletionRate,
    int CommentCount,
    int ChapterCount,
    int NominationCount);

public sealed record EnrollmentDto(
    Guid Id,
    Guid CourseId,
    UserRefDto User,
    string Status,
    Guid? RequestId,
    DateTimeOffset StatusChangedAt);
