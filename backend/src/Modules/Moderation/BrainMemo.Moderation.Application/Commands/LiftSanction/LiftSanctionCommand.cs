using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Moderation.Application.Commands.LiftSanction;

public sealed record LiftSanctionCommand(
    Guid SanctionId,
    Guid AdminUserId,
    LiftSanctionRequest Request) : IRequest<Result>;

public sealed class LiftSanctionCommandHandler(
    IModerationRepository repository,
    IIdentityContract identityContract,
    ICourseContract courseContract,
    ILearningContract learningContract,
    IClock clock) : IRequestHandler<LiftSanctionCommand, Result>
{
    public async Task<Result> Handle(LiftSanctionCommand command, CancellationToken ct)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        Sanction? sanction = await repository.FindSanctionByIdAsync(command.SanctionId, ct).ConfigureAwait(false);
        if (sanction is null)
        {
            return Error.NotFound("Không tìm thấy chế tài.");
        }

        if (sanction.SanctionType == SanctionType.CoursePermanentDelete)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Chế tài xóa vĩnh viễn khóa học không thể gỡ bỏ.");
        }

        if (!sanction.IsActive)
        {
            // Already lifted, idempotent
            return Result.Success();
        }

        AuditAction liftAction;
        switch (sanction.SanctionType)
        {
            case SanctionType.AccountLockTemporary or SanctionType.AccountLockPermanent:
                liftAction = AuditAction.AccountUnlocked;
                Result unlockResult = await identityContract.UnlockAccount(
                    sanction.TargetId,
                    command.Request.Reason,
                    command.AdminUserId,
                    ct).ConfigureAwait(false);
                if (unlockResult.IsFailure) return unlockResult;
                break;

            case SanctionType.CourseHide:
                liftAction = AuditAction.CourseRestored;
                Result restoreResult = courseContract.RestoreCourse(sanction.TargetId, sanction.Id, ActorKind.Admin);
                if (restoreResult.IsFailure) return restoreResult;
                break;

            case SanctionType.CommentDelete:
                liftAction = AuditAction.CommentRestored;
                Result restoreCommentResult = learningContract.RestoreComment(sanction.TargetId, command.AdminUserId);
                if (restoreCommentResult.IsFailure) return restoreCommentResult;
                break;

            default:
                return Error.Validation("Loại chế tài không hỗ trợ gỡ.");
        }

        Result liftResult = sanction.Lift(command.AdminUserId, command.Request.Reason, LiftKind.Manual, utcNow);
        if (liftResult.IsFailure) return liftResult;

        AuditObjectType auditObjType = sanction.TargetType switch
        {
            SanctionTargetType.Course => AuditObjectType.Course,
            SanctionTargetType.Comment => AuditObjectType.Comment,
            _ => AuditObjectType.User,
        };

        Result<AuditLog> auditLogResult = AuditLog.Create(
            Guid.NewGuid(),
            AuditActorType.Admin,
            command.AdminUserId,
            liftAction,
            auditObjType,
            sanction.TargetId,
            null,
            command.Request.Reason,
            null,
            sanction.ReportId,
            sanction.Id,
            utcNow);

        if (auditLogResult.IsSuccess)
        {
            await repository.AddAuditLogAsync(auditLogResult.Value, ct).ConfigureAwait(false);
        }

        await repository.SaveChangesAsync(ct).ConfigureAwait(false);

        return Result.Success();
    }
}
