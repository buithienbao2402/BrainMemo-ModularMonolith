using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Moderation.Domain.Entities;

public sealed class Sanction : AggregateRoot
{
    public const int MaxReasonLength = 1000;

    private Sanction()
    {
    }

    private Sanction(
        Guid id,
        Guid? reportId,
        SanctionType sanctionType,
        SanctionTargetType targetType,
        Guid targetId,
        Guid subjectUserId,
        string reason,
        Guid appliedByUserId,
        DateTimeOffset appliedAt,
        DateTimeOffset? expiresAt) : base(id)
    {
        ReportId = reportId;
        SanctionType = sanctionType;
        TargetType = targetType;
        TargetId = targetId;
        SubjectUserId = subjectUserId;
        Reason = reason;
        AppliedByUserId = appliedByUserId;
        AppliedAt = appliedAt;
        ExpiresAt = expiresAt;
    }

    public Guid? ReportId { get; private set; }

    public SanctionType SanctionType { get; private set; }

    public SanctionTargetType TargetType { get; private set; }

    public Guid TargetId { get; private set; }

    public Guid SubjectUserId { get; private set; }

    public string Reason { get; private set; } = string.Empty;

    public Guid AppliedByUserId { get; private set; }

    public DateTimeOffset AppliedAt { get; private set; }

    public DateTimeOffset? ExpiresAt { get; private set; }

    public DateTimeOffset? LiftedAt { get; private set; }

    public Guid? LiftedByUserId { get; private set; }

    public string? LiftReason { get; private set; }

    public LiftKind? LiftKind { get; private set; }

    public bool IsActive => LiftedAt is null;

    public static Result<Sanction> Create(
        Guid id,
        Guid? reportId,
        SanctionType sanctionType,
        SanctionTargetType targetType,
        Guid targetId,
        Guid subjectUserId,
        string reason,
        Guid appliedByUserId,
        DateTimeOffset? expiresAt,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID chế tài không hợp lệ.");
        }

        if (targetId == Guid.Empty)
        {
            return Error.Validation("ID đối tượng áp dụng chế tài không hợp lệ.");
        }

        if (subjectUserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng chịu chế tài không hợp lệ.");
        }

        if (appliedByUserId == Guid.Empty)
        {
            return Error.Validation("ID quản trị viên áp dụng chế tài không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > MaxReasonLength)
        {
            return Error.Validation($"Lý do áp dụng chế tài phải từ 1 đến {MaxReasonLength} ký tự.");
        }

        if (sanctionType == SanctionType.AccountLockTemporary)
        {
            if (expiresAt is null || expiresAt.Value <= utcNow)
            {
                return Error.Validation("Khóa tài khoản tạm thời bắt buộc phải có thời điểm hết hạn trong tương lai.");
            }
        }
        else if (sanctionType is SanctionType.AccountLockPermanent or SanctionType.CommentDelete or SanctionType.CoursePermanentDelete)
        {
            if (expiresAt is not null)
            {
                return Error.Validation("Chế tài này không được thiết lập thời điểm hết hạn.");
            }
        }

        return new Sanction(
            id,
            reportId,
            sanctionType,
            targetType,
            targetId,
            subjectUserId,
            reason.Trim(),
            appliedByUserId,
            utcNow,
            expiresAt);
    }

    public Result Lift(
        Guid? liftedByUserId,
        string liftReason,
        LiftKind kind,
        DateTimeOffset utcNow)
    {
        if (SanctionType == SanctionType.CoursePermanentDelete)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Chế tài xóa vĩnh viễn khóa học không thể gỡ bỏ.");
        }

        if (LiftedAt is not null)
        {
            // Idempotent: already lifted
            return Result.Success();
        }

        if (kind == BrainMemo.Moderation.Contracts.Enums.LiftKind.Manual)
        {
            if (!liftedByUserId.HasValue || liftedByUserId.Value == Guid.Empty)
            {
                return Error.Validation("ID quản trị viên gỡ chế tài không hợp lệ.");
            }

            if (string.IsNullOrWhiteSpace(liftReason) || liftReason.Trim().Length > MaxReasonLength)
            {
                return Error.Validation($"Lý do gỡ chế tài phải từ 1 đến {MaxReasonLength} ký tự.");
            }
        }

        LiftedAt = utcNow;
        LiftedByUserId = liftedByUserId;
        LiftReason = string.IsNullOrWhiteSpace(liftReason) ? "Hết thời hạn chế tài" : liftReason.Trim();
        LiftKind = kind;

        return Result.Success();
    }
}
