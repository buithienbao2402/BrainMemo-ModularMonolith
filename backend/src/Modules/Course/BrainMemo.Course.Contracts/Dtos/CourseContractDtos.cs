using BrainMemo.Course.Contracts.Enums;

namespace BrainMemo.Course.Contracts.Dtos;

public sealed record UserRefDto(Guid Id, string DisplayName, string? AvatarUrl = null);

public sealed record CourseAccessDto(
    bool Exists,
    string EffectiveState, /* ACTIVE | HIDDEN | DELETED */
    string AccessMode,     /* PUBLIC | PRIVATE | ONLY_ME */
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
    string Reason /* OK | COURSE_DENIED | PASSCODE_REQUIRED | NOT_ENROLLED | NOT_FOUND */);

public sealed record CourseSummaryDto(
    Guid Id,
    string? Name,
    string? Description,
    string? CoverUrl,
    Guid OwnerUserId,
    string AccessMode,
    string Status,
    bool Visible,
    IReadOnlyList<string>? Tags = null);

public sealed record ReportTargetDto(
    Guid CourseId,
    string CourseName,
    Guid OwnerUserId,
    string AccessMode,
    bool CanBeReported);

public sealed record CourseSnapshotDto(
    Guid Id,
    Guid OwnerUserId,
    string Name,
    string? Description,
    string AccessMode,
    string Status,
    IReadOnlyList<string> Tags,
    uint Revision,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record EnrollmentFactDto(
    Guid EnrollmentId,
    Guid CourseId,
    Guid UserId,
    string Status,
    DateTimeOffset? FirstEnrolledAt,
    DateTimeOffset StatusChangedAt);

public sealed record NominationFactDto(
    Guid NominationId,
    Guid CourseId,
    Guid UserId,
    DateTimeOffset NominatedAt,
    DateTimeOffset? WithdrawnAt,
    bool IsActive);

public sealed record CourseViewerDto(
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
    CourseViewerDto Viewer,
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
