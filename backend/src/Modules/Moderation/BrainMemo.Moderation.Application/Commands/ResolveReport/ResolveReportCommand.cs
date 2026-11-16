using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Contracts.Events;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Moderation.Application.Commands.ResolveReport;

public sealed record ResolveReportCommand(
    Guid ReportId,
    Guid AdminUserId,
    ResolveReportRequest Request) : IRequest<Result<ReportDto>>;

public sealed class ResolveReportCommandHandler(
    IModerationRepository repository,
    IModerationTransaction moderationTransaction,
    IIdentityContract identityContract,
    ICourseContract courseContract,
    ILearningContract learningContract,
    IProfileContract profileContract,
    IEventBus eventBus,
    IClock clock) : IRequestHandler<ResolveReportCommand, Result<ReportDto>>
{
    public async Task<Result<ReportDto>> Handle(ResolveReportCommand command, CancellationToken ct)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        ResolveReportRequest req = command.Request;

        if (!Enum.TryParse<ReportStatus>(req.Decision, true, out ReportStatus decision)
            || decision is not (ReportStatus.Accepted or ReportStatus.Rejected))
        {
            return Error.Validation("Quyết định phải là ACCEPTED hoặc REJECTED.");
        }

        List<SanctionEventItemDto> appliedEventSanctions = [];
        ReportResolved? postCommitEvent = null;

        // Transactional execution ADR-03
        Result<Report> txResult = await moderationTransaction.RunAsync(async _ =>
        {
            Report? report = await repository.FindReportByIdAsync(command.ReportId, ct).ConfigureAwait(false);
            if (report is null)
            {
                return Error.NotFound("Không tìm thấy báo cáo.");
            }

            if (report.Status != ReportStatus.Pending)
            {
                return Error.Conflict(ErrorCodes.InvalidState, "Báo cáo không còn ở trạng thái chờ duyệt (PENDING).");
            }

            if (decision == ReportStatus.Accepted && req.Sanctions is not null && req.Sanctions.Count > 0)
            {
                foreach (SanctionRequest sReq in req.Sanctions)
                {
                    if (!TryParseSanctionType(sReq.SanctionType, out SanctionType sanctionType))
                    {
                        return Error.Validation($"Loại chế tài {sReq.SanctionType} không hợp lệ.");
                    }

                    Guid sanctionId = Guid.NewGuid();
                    SanctionTargetType targetType;
                    AuditAction auditAction;
                    string? objectLabel = null;

                    switch (sanctionType)
                    {
                        case SanctionType.CommentDelete:
                            targetType = SanctionTargetType.Comment;
                            auditAction = AuditAction.CommentDeleted;
                            Result commentResult = learningContract.SoftDeleteComment(sReq.TargetId, command.AdminUserId);
                            if (commentResult.IsFailure) return commentResult.Error;
                            break;

                        case SanctionType.CourseHide:
                            targetType = SanctionTargetType.Course;
                            auditAction = AuditAction.CourseHidden;
                            Result hideResult = courseContract.HideCourse(sReq.TargetId, sanctionId, command.AdminUserId);
                            if (hideResult.IsFailure) return hideResult.Error;
                            break;

                        case SanctionType.AccountLockTemporary:
                            targetType = SanctionTargetType.User;
                            auditAction = AuditAction.AccountLockedTemporary;
                            Result lockTempResult = await identityContract.LockAccount(
                                sReq.TargetId,
                                LockType.Temporary,
                                sReq.ExpiresAt,
                                sReq.Reason,
                                sanctionId,
                                command.AdminUserId,
                                ct).ConfigureAwait(false);
                            if (lockTempResult.IsFailure) return lockTempResult.Error;
                            break;

                        case SanctionType.AccountLockPermanent:
                            targetType = SanctionTargetType.User;
                            auditAction = AuditAction.AccountLockedPermanent;
                            Result lockPermResult = await identityContract.LockAccount(
                                sReq.TargetId,
                                LockType.Permanent,
                                null,
                                sReq.Reason,
                                sanctionId,
                                command.AdminUserId,
                                ct).ConfigureAwait(false);
                            if (lockPermResult.IsFailure) return lockPermResult.Error;
                            break;

                        case SanctionType.CoursePermanentDelete:
                            targetType = SanctionTargetType.Course;
                            auditAction = AuditAction.CoursePermanentlyDeleted;
                            bool confirmed = req.ConfirmPermanentDelete == true || sReq.Confirm == true;
                            if (!confirmed)
                            {
                                return Error.Validation("Xóa vĩnh viễn khóa học yêu cầu phải có cờ xác nhận (confirmPermanentDelete).");
                            }

                            Result<string> deleteResult = courseContract.PermanentlyDeleteCourse(sReq.TargetId, command.AdminUserId);
                            if (deleteResult.IsFailure) return deleteResult.Error;
                            objectLabel = deleteResult.Value;
                            break;

                        default:
                            return Error.Validation("Chế tài không được hỗ trợ.");
                    }

                    Result<Sanction> sanctionResult = Sanction.Create(
                        sanctionId,
                        report.Id,
                        sanctionType,
                        targetType,
                        sReq.TargetId,
                        report.TargetOwnerUserId,
                        sReq.Reason,
                        command.AdminUserId,
                        sReq.ExpiresAt,
                        utcNow);

                    if (sanctionResult.IsFailure) return sanctionResult.Error;

                    await repository.AddSanctionAsync(sanctionResult.Value, ct).ConfigureAwait(false);

                    AuditObjectType auditObjType = targetType switch
                    {
                        SanctionTargetType.Course => AuditObjectType.Course,
                        SanctionTargetType.Comment => AuditObjectType.Comment,
                        _ => AuditObjectType.User,
                    };

                    Result<AuditLog> sanctionLogResult = AuditLog.Create(
                        Guid.NewGuid(),
                        AuditActorType.Admin,
                        command.AdminUserId,
                        auditAction,
                        auditObjType,
                        sReq.TargetId,
                        objectLabel ?? report.TargetSnapshot,
                        sReq.Reason,
                        null,
                        report.Id,
                        sanctionId,
                        utcNow);

                    if (sanctionLogResult.IsSuccess)
                    {
                        await repository.AddAuditLogAsync(sanctionLogResult.Value, ct).ConfigureAwait(false);
                    }

                    appliedEventSanctions.Add(new SanctionEventItemDto(
                        sanctionId,
                        sanctionType.ToString().ToUpperInvariant(),
                        sReq.TargetId,
                        sReq.Reason,
                        sReq.ExpiresAt));
                }
            }

            Result resolveResult = report.Resolve(decision, req.Reason, command.AdminUserId, utcNow);
            if (resolveResult.IsFailure)
            {
                return resolveResult.Error;
            }

            AuditAction reportAuditAction = decision == ReportStatus.Accepted
                ? AuditAction.ReportAccepted
                : AuditAction.ReportRejected;

            Result<AuditLog> reportAuditLogResult = AuditLog.Create(
                Guid.NewGuid(),
                AuditActorType.Admin,
                command.AdminUserId,
                reportAuditAction,
                AuditObjectType.Report,
                report.Id,
                report.TargetSnapshot,
                req.Reason,
                null,
                report.Id,
                null,
                utcNow);

            if (reportAuditLogResult.IsSuccess)
            {
                await repository.AddAuditLogAsync(reportAuditLogResult.Value, ct).ConfigureAwait(false);
            }

            await repository.SaveChangesAsync(ct).ConfigureAwait(false);

            postCommitEvent = new ReportResolved(
                Guid.NewGuid(),
                utcNow,
                report.Id,
                report.Source.ToString().ToUpperInvariant(),
                decision.ToString().ToUpperInvariant(),
                req.Reason,
                report.ReporterUserId,
                report.TargetOwnerUserId,
                appliedEventSanctions);

            return Result.Success(report);
        }, ct).ConfigureAwait(false);

        if (txResult.IsFailure)
        {
            return txResult.Error;
        }

        // Post-commit dispatch
        if (postCommitEvent is not null)
        {
            await eventBus.Publish(postCommitEvent, ct).ConfigureAwait(false);
        }

        Report resolvedReport = txResult.Value;
        return Result.Success(await MapToReportDtoAsync(resolvedReport, ct).ConfigureAwait(false));
    }

    private async Task<ReportDto> MapToReportDtoAsync(Report r, CancellationToken ct)
    {
        UserRefDto? reporterRef = null;
        if (r.ReporterUserId.HasValue)
        {
            var p = await profileContract.GetPublicProfile(r.ReporterUserId.Value, ct).ConfigureAwait(false);
            if (p.IsSuccess)
            {
                reporterRef = new UserRefDto(r.ReporterUserId.Value, null, p.Value.DisplayName, p.Value.AvatarUrl);
            }
        }

        UserRefDto? ownerRef = null;
        var ownerP = await profileContract.GetPublicProfile(r.TargetOwnerUserId, ct).ConfigureAwait(false);
        if (ownerP.IsSuccess)
        {
            ownerRef = new UserRefDto(r.TargetOwnerUserId, null, ownerP.Value.DisplayName, ownerP.Value.AvatarUrl);
        }

        var evDtos = r.Evidences.Select(e => new ReportEvidenceDto(
            e.Id,
            e.Kind.ToString().ToUpperInvariant(),
            e.StorageKey,
            e.Url)).ToList();

        return new ReportDto(
            r.Id,
            r.Source.ToString().ToUpperInvariant(),
            reporterRef,
            r.TargetType.ToString().ToUpperInvariant(),
            r.TargetId,
            r.TargetCourseId,
            ownerRef,
            r.ReasonCode,
            r.Description,
            r.TargetSnapshot,
            r.Status.ToString().ToUpperInvariant(),
            r.ResolutionReason,
            r.ResolvedAt,
            r.CreatedAt,
            evDtos,
            r.AiScore);
    }

    private static bool TryParseSanctionType(string? raw, out SanctionType type)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            type = default;
            return false;
        }

        string normalized = raw.Replace("_", string.Empty);
        return Enum.TryParse(normalized, ignoreCase: true, out type);
    }
}
