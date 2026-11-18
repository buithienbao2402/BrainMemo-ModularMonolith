using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Contracts.Events;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Moderation.Application.Commands.ApplySanction;

public sealed record ApplySanctionCommand(
    Guid AdminUserId,
    SanctionRequest Request) : IRequest<Result<Guid>>;

public sealed class ApplySanctionCommandHandler(
    IModerationRepository repository,
    IIdentityContract identityContract,
    ICourseContract courseContract,
    ILearningContract learningContract,
    IEventBus eventBus,
    IClock clock) : IRequestHandler<ApplySanctionCommand, Result<Guid>>
{
    public async Task<Result<Guid>> Handle(ApplySanctionCommand command, CancellationToken ct)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        SanctionRequest req = command.Request;

        if (!TryParseSanctionType(req.SanctionType, out SanctionType sanctionType))
        {
            return Error.Validation($"Loại chế tài {req.SanctionType} không hợp lệ.");
        }

        Guid sanctionId = Guid.NewGuid();
        Guid subjectUserId;
        SanctionTargetType targetType;
        AuditAction auditAction;
        string? objectLabel = null;

        switch (sanctionType)
        {
            case SanctionType.CommentDelete:
                targetType = SanctionTargetType.Comment;
                auditAction = AuditAction.CommentDeleted;
                var commentTarget = learningContract.ResolveReportTarget(req.TargetId, command.AdminUserId);
                if (commentTarget.IsFailure) return commentTarget.Error;
                subjectUserId = commentTarget.Value.AuthorUserId;
                objectLabel = commentTarget.Value.Content;

                Result commentResult = learningContract.SoftDeleteComment(req.TargetId, command.AdminUserId);
                if (commentResult.IsFailure) return commentResult.Error;
                break;

            case SanctionType.CourseHide:
                targetType = SanctionTargetType.Course;
                auditAction = AuditAction.CourseHidden;
                var courseTarget = courseContract.ResolveReportTarget(req.TargetId, command.AdminUserId);
                if (courseTarget.IsFailure) return courseTarget.Error;
                subjectUserId = courseTarget.Value.OwnerUserId;
                objectLabel = courseTarget.Value.CourseName;

                Result hideResult = courseContract.HideCourse(req.TargetId, sanctionId, command.AdminUserId);
                if (hideResult.IsFailure) return hideResult.Error;
                break;

            case SanctionType.AccountLockTemporary:
                targetType = SanctionTargetType.User;
                auditAction = AuditAction.AccountLockedTemporary;
                subjectUserId = req.TargetId;

                Result lockTempResult = await identityContract.LockAccount(
                    req.TargetId,
                    LockType.Temporary,
                    req.ExpiresAt,
                    req.Reason,
                    sanctionId,
                    command.AdminUserId,
                    ct).ConfigureAwait(false);
                if (lockTempResult.IsFailure) return lockTempResult.Error;
                break;

            case SanctionType.AccountLockPermanent:
                targetType = SanctionTargetType.User;
                auditAction = AuditAction.AccountLockedPermanent;
                subjectUserId = req.TargetId;

                Result lockPermResult = await identityContract.LockAccount(
                    req.TargetId,
                    LockType.Permanent,
                    null,
                    req.Reason,
                    sanctionId,
                    command.AdminUserId,
                    ct).ConfigureAwait(false);
                if (lockPermResult.IsFailure) return lockPermResult.Error;
                break;

            case SanctionType.CoursePermanentDelete:
                targetType = SanctionTargetType.Course;
                auditAction = AuditAction.CoursePermanentlyDeleted;
                if (req.Confirm != true)
                {
                    return Error.Validation("Xóa vĩnh viễn khóa học yêu cầu phải có cờ xác nhận (confirm).");
                }

                var deleteCourseTarget = courseContract.ResolveReportTarget(req.TargetId, command.AdminUserId);
                if (deleteCourseTarget.IsFailure) return deleteCourseTarget.Error;
                subjectUserId = deleteCourseTarget.Value.OwnerUserId;

                Result<string> deleteResult = courseContract.PermanentlyDeleteCourse(req.TargetId, command.AdminUserId);
                if (deleteResult.IsFailure) return deleteResult.Error;
                objectLabel = deleteResult.Value;
                break;

            default:
                return Error.Validation("Chế tài không được hỗ trợ.");
        }

        Result<Sanction> sanctionResult = Sanction.Create(
            sanctionId,
            null,
            sanctionType,
            targetType,
            req.TargetId,
            subjectUserId,
            req.Reason,
            command.AdminUserId,
            req.ExpiresAt,
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
            req.TargetId,
            objectLabel,
            req.Reason,
            null,
            null,
            sanctionId,
            utcNow);

        if (sanctionLogResult.IsSuccess)
        {
            await repository.AddAuditLogAsync(sanctionLogResult.Value, ct).ConfigureAwait(false);
        }

        await repository.SaveChangesAsync(ct).ConfigureAwait(false);

        // Publish SanctionApplied event post commit
        SanctionApplied appliedEvent = new(
            Guid.NewGuid(),
            utcNow,
            sanctionId,
            subjectUserId,
            sanctionType.ToString().ToUpperInvariant(),
            req.Reason,
            req.ExpiresAt);

        await eventBus.Publish(appliedEvent, ct).ConfigureAwait(false);

        return Result.Success(sanctionId);
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
