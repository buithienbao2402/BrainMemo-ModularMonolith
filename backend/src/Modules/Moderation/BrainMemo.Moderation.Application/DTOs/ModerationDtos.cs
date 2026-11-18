namespace BrainMemo.Moderation.Application.DTOs;

public sealed record UserRefDto(
    Guid Id,
    string? Email,
    string? DisplayName,
    string? AvatarUrl);

public sealed record ReportEvidenceDto(
    Guid Id,
    string Kind,
    string? UploadKey,
    string? Url);

public sealed record ReportDto(
    Guid Id,
    string Source,
    UserRefDto? Reporter,
    string TargetType,
    Guid TargetId,
    Guid TargetCourseId,
    UserRefDto? TargetOwner,
    string ReasonCode,
    string? Description,
    string? TargetSnapshot,
    string Status,
    string? ResolutionReason,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt,
    IReadOnlyList<ReportEvidenceDto> Evidence,
    decimal? AiScore);

public sealed record CreateReportEvidenceRequest(
    string Kind,
    string? UploadKey,
    string? Url);

public sealed record CreateReportRequest(
    string TargetType,
    Guid TargetId,
    string ReasonCode,
    string? Description,
    IReadOnlyList<CreateReportEvidenceRequest>? Evidence);

public sealed record SanctionRequest(
    string SanctionType,
    Guid TargetId,
    string Reason,
    DateTimeOffset? ExpiresAt,
    bool? Confirm);

public sealed record ResolveReportRequest(
    string Decision,
    string Reason,
    IReadOnlyList<SanctionRequest>? Sanctions,
    bool? ConfirmPermanentDelete);

public sealed record LiftSanctionRequest(
    string Reason);

public sealed record SanctionDto(
    Guid Id,
    Guid? ReportId,
    string SanctionType,
    string TargetType,
    Guid TargetId,
    Guid SubjectUserId,
    string Reason,
    Guid AppliedByUserId,
    DateTimeOffset AppliedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? LiftedAt,
    Guid? LiftedByUserId,
    string? LiftReason,
    string? LiftKind,
    bool IsActive);

public sealed record AuditLogDto(
    Guid Id,
    DateTimeOffset OccurredAt,
    string ActorType,
    Guid? ActorUserId,
    string Action,
    string ObjectType,
    Guid ObjectId,
    string? ObjectLabel,
    string Reason,
    string? Details,
    Guid? ReportId,
    Guid? SanctionId);

public sealed record ModerationDashboardDto(
    int PendingReports,
    int PendingCourseReviews,
    IReadOnlyList<object> LockedUsers,
    IReadOnlyList<object> HiddenCourses);

public sealed record RejectCoursePublishRequest(string Reason);

public sealed record PageMetaDto(
    int Page,
    int PageSize,
    int Total,
    int TotalPages);

public sealed record PagedListResponse<T>(
    IReadOnlyList<T> Items,
    PageMetaDto Meta);

public sealed record IdResponse(Guid Id);
