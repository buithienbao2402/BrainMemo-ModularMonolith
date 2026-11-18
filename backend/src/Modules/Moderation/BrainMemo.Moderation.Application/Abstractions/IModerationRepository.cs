using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;

namespace BrainMemo.Moderation.Application.Abstractions;

public interface IModerationRepository
{
    Task<Report?> FindReportByIdAsync(Guid id, CancellationToken ct = default);

    Task<bool> HasPendingReportAsync(Guid reporterUserId, ReportTargetType targetType, Guid targetId, CancellationToken ct = default);

    Task<bool> HasAiFindingReportAsync(Guid aiFindingId, CancellationToken ct = default);

    Task AddReportAsync(Report report, CancellationToken ct = default);

    Task<PagedListResponse<Report>> ListReportsAsync(
        ReportStatus? status,
        ReportSource? source,
        ReportTargetType? targetType,
        Guid? courseId,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<Sanction?> FindSanctionByIdAsync(Guid id, CancellationToken ct = default);

    Task<Sanction?> FindActiveSanctionAsync(SanctionType sanctionType, Guid targetId, CancellationToken ct = default);

    Task AddSanctionAsync(Sanction sanction, CancellationToken ct = default);

    Task<PagedListResponse<Sanction>> ListSanctionsAsync(
        bool? active,
        SanctionType? type,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<List<Sanction>> ListExpiredActiveSanctionsAsync(DateTimeOffset utcNow, CancellationToken ct = default);

    Task AddAuditLogAsync(AuditLog log, CancellationToken ct = default);

    Task<PagedListResponse<AuditLog>> ListAuditLogsAsync(
        AuditAction? action,
        AuditObjectType? objectType,
        Guid? actorUserId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<ModerationDashboardDto> GetDashboardStatsAsync(DateTimeOffset utcNow, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
