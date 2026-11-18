using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Moderation.Domain.Entities;

public sealed class AuditLog : Entity
{
    public const int MaxLabelLength = 255;
    public const int MaxReasonLength = 1000;

    private AuditLog()
    {
    }

    private AuditLog(
        Guid id,
        DateTimeOffset occurredAt,
        AuditActorType actorType,
        Guid? actorUserId,
        AuditAction action,
        AuditObjectType objectType,
        Guid objectId,
        string? objectLabel,
        string reason,
        string? details,
        Guid? reportId,
        Guid? sanctionId) : base(id)
    {
        OccurredAt = occurredAt;
        ActorType = actorType;
        ActorUserId = actorUserId;
        Action = action;
        ObjectType = objectType;
        ObjectId = objectId;
        ObjectLabel = objectLabel;
        Reason = reason;
        Details = details;
        ReportId = reportId;
        SanctionId = sanctionId;
    }

    public DateTimeOffset OccurredAt { get; private set; }

    public AuditActorType ActorType { get; private set; }

    public Guid? ActorUserId { get; private set; }

    public AuditAction Action { get; private set; }

    public AuditObjectType ObjectType { get; private set; }

    public Guid ObjectId { get; private set; }

    public string? ObjectLabel { get; private set; }

    public string Reason { get; private set; } = string.Empty;

    public string? Details { get; private set; }

    public Guid? ReportId { get; private set; }

    public Guid? SanctionId { get; private set; }

    public static Result<AuditLog> Create(
        Guid id,
        AuditActorType actorType,
        Guid? actorUserId,
        AuditAction action,
        AuditObjectType objectType,
        Guid objectId,
        string? objectLabel,
        string reason,
        string? details,
        Guid? reportId,
        Guid? sanctionId,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID nhật ký kiểm toán không hợp lệ.");
        }

        if (actorType == AuditActorType.Admin && (!actorUserId.HasValue || actorUserId.Value == Guid.Empty))
        {
            return Error.Validation("ID quản trị viên thao tác không hợp lệ.");
        }

        if (actorType == AuditActorType.System && actorUserId.HasValue)
        {
            return Error.Validation("Thao tác hệ thống không được gán actorUserId.");
        }

        if (objectId == Guid.Empty)
        {
            return Error.Validation("ID đối tượng tác động không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > MaxReasonLength)
        {
            return Error.Validation($"Lý do thao tác phải từ 1 đến {MaxReasonLength} ký tự.");
        }

        string? normalizedLabel = objectLabel?.Trim();
        if (normalizedLabel is not null && normalizedLabel.Length > MaxLabelLength)
        {
            normalizedLabel = normalizedLabel[..MaxLabelLength];
        }

        return new AuditLog(
            id,
            utcNow,
            actorType,
            actorUserId,
            action,
            objectType,
            objectId,
            normalizedLabel,
            reason.Trim(),
            details,
            reportId,
            sanctionId);
    }
}
