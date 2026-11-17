using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Moderation.Infrastructure.Persistence;

public sealed class ModerationRepository(ModerationDbContext dbContext) : IModerationRepository
{
    public async Task<Report?> FindReportByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await dbContext.Reports
            .Include(r => r.Evidences)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<bool> HasPendingReportAsync(
        Guid reporterUserId,
        ReportTargetType targetType,
        Guid targetId,
        CancellationToken ct = default)
    {
        return await dbContext.Reports
            .AsNoTracking()
            .AnyAsync(r =>
                r.ReporterUserId == reporterUserId
                && r.TargetType == targetType
                && r.TargetId == targetId
                && r.Status == ReportStatus.Pending, ct)
            .ConfigureAwait(false);
    }

    public async Task<bool> HasAiFindingReportAsync(Guid aiFindingId, CancellationToken ct = default)
    {
        return await dbContext.Reports
            .AsNoTracking()
            .AnyAsync(r => r.AiFindingId == aiFindingId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddReportAsync(Report report, CancellationToken ct = default)
    {
        await dbContext.Reports.AddAsync(report, ct).ConfigureAwait(false);
    }

    public async Task<PagedListResponse<Report>> ListReportsAsync(
        ReportStatus? status,
        ReportSource? source,
        ReportTargetType? targetType,
        Guid? courseId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Report> query = dbContext.Reports
            .Include(r => r.Evidences)
            .AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        if (source.HasValue)
        {
            query = query.Where(r => r.Source == source.Value);
        }

        if (targetType.HasValue)
        {
            query = query.Where(r => r.TargetType == targetType.Value);
        }

        if (courseId.HasValue)
        {
            query = query.Where(r => r.TargetCourseId == courseId.Value);
        }

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        int totalPages = (int)Math.Ceiling(total / (double)pageSize);

        List<Report> items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedListResponse<Report>(
            items,
            new PageMetaDto(page, pageSize, total, totalPages));
    }

    public async Task<Sanction?> FindSanctionByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await dbContext.Sanctions
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<Sanction?> FindActiveSanctionAsync(
        SanctionType sanctionType,
        Guid targetId,
        CancellationToken ct = default)
    {
        return await dbContext.Sanctions
            .FirstOrDefaultAsync(s =>
                s.SanctionType == sanctionType
                && s.TargetId == targetId
                && s.LiftedAt == null, ct)
            .ConfigureAwait(false);
    }

    public async Task AddSanctionAsync(Sanction sanction, CancellationToken ct = default)
    {
        await dbContext.Sanctions.AddAsync(sanction, ct).ConfigureAwait(false);
    }

    public async Task<PagedListResponse<Sanction>> ListSanctionsAsync(
        bool? active,
        SanctionType? type,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Sanction> query = dbContext.Sanctions.AsNoTracking();

        if (active.HasValue)
        {
            query = active.Value
                ? query.Where(s => s.LiftedAt == null)
                : query.Where(s => s.LiftedAt != null);
        }

        if (type.HasValue)
        {
            query = query.Where(s => s.SanctionType == type.Value);
        }

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        int totalPages = (int)Math.Ceiling(total / (double)pageSize);

        List<Sanction> items = await query
            .OrderByDescending(s => s.AppliedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedListResponse<Sanction>(
            items,
            new PageMetaDto(page, pageSize, total, totalPages));
    }

    public async Task<List<Sanction>> ListExpiredActiveSanctionsAsync(
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        return await dbContext.Sanctions
            .Where(s =>
                s.LiftedAt == null
                && s.ExpiresAt != null
                && s.ExpiresAt <= utcNow)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAuditLogAsync(AuditLog log, CancellationToken ct = default)
    {
        await dbContext.AuditLogs.AddAsync(log, ct).ConfigureAwait(false);
    }

    public async Task<PagedListResponse<AuditLog>> ListAuditLogsAsync(
        AuditAction? action,
        AuditObjectType? objectType,
        Guid? actorUserId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<AuditLog> query = dbContext.AuditLogs.AsNoTracking();

        if (action.HasValue)
        {
            query = query.Where(a => a.Action == action.Value);
        }

        if (objectType.HasValue)
        {
            query = query.Where(a => a.ObjectType == objectType.Value);
        }

        if (actorUserId.HasValue)
        {
            query = query.Where(a => a.ActorUserId == actorUserId.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(a => a.OccurredAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(a => a.OccurredAt <= to.Value);
        }

        int total = await query.CountAsync(ct).ConfigureAwait(false);
        int totalPages = (int)Math.Ceiling(total / (double)pageSize);

        List<AuditLog> items = await query
            .OrderByDescending(a => a.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedListResponse<AuditLog>(
            items,
            new PageMetaDto(page, pageSize, total, totalPages));
    }

    public async Task<ModerationDashboardDto> GetDashboardStatsAsync(
        DateTimeOffset utcNow,
        CancellationToken ct = default)
    {
        int pendingReports = await dbContext.Reports
            .CountAsync(r => r.Status == ReportStatus.Pending && r.Source == ReportSource.User, ct)
            .ConfigureAwait(false);

        var activeLockSanctions = await dbContext.Sanctions
            .AsNoTracking()
            .Where(s => s.LiftedAt == null && (s.SanctionType == SanctionType.AccountLockTemporary || s.SanctionType == SanctionType.AccountLockPermanent))
            .OrderByDescending(s => s.AppliedAt)
            .Take(10)
            .Select(s => new
            {
                s.Id,
                s.TargetId,
                s.SubjectUserId,
                type = s.SanctionType.ToString().ToUpperInvariant(),
                s.Reason,
                s.AppliedAt,
                s.ExpiresAt,
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        var activeHideSanctions = await dbContext.Sanctions
            .AsNoTracking()
            .Where(s => s.LiftedAt == null && s.SanctionType == SanctionType.CourseHide)
            .OrderByDescending(s => s.AppliedAt)
            .Take(10)
            .Select(s => new
            {
                s.Id,
                s.TargetId,
                s.SubjectUserId,
                type = s.SanctionType.ToString().ToUpperInvariant(),
                s.Reason,
                s.AppliedAt,
                s.ExpiresAt,
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new ModerationDashboardDto(
            pendingReports,
            0,
            activeLockSanctions.Cast<object>().ToList(),
            activeHideSanctions.Cast<object>().ToList());
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
