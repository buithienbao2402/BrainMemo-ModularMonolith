using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Moderation.Domain.Entities;

public sealed class Report : AggregateRoot
{
    public const int MaxReasonCodeLength = 30;
    public const int MaxResolutionReasonLength = 1000;

    private readonly List<ReportEvidence> _evidences = [];

    private Report()
    {
    }

    private Report(
        Guid id,
        ReportSource source,
        Guid? reporterUserId,
        ReportTargetType targetType,
        Guid targetId,
        Guid targetCourseId,
        Guid targetOwnerUserId,
        Guid? aiFindingId,
        string reasonCode,
        string? description,
        string? targetSnapshot,
        decimal? aiScore,
        DateTimeOffset createdAt) : base(id)
    {
        Source = source;
        ReporterUserId = reporterUserId;
        TargetType = targetType;
        TargetId = targetId;
        TargetCourseId = targetCourseId;
        TargetOwnerUserId = targetOwnerUserId;
        AiFindingId = aiFindingId;
        ReasonCode = reasonCode;
        Description = description;
        TargetSnapshot = targetSnapshot;
        AiScore = aiScore;
        Status = ReportStatus.Pending;
        CreatedAt = createdAt;
    }

    public ReportSource Source { get; private set; }

    public Guid? ReporterUserId { get; private set; }

    public ReportTargetType TargetType { get; private set; }

    public Guid TargetId { get; private set; }

    public Guid TargetCourseId { get; private set; }

    public Guid TargetOwnerUserId { get; private set; }

    public Guid? AiFindingId { get; private set; }

    public string ReasonCode { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public string? TargetSnapshot { get; private set; }

    public decimal? AiScore { get; private set; }

    public ReportStatus Status { get; private set; }

    public string? ResolutionReason { get; private set; }

    public Guid? ResolvedByUserId { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public IReadOnlyCollection<ReportEvidence> Evidences => _evidences.AsReadOnly();

    public static Result<Report> CreateUserReport(
        Guid id,
        Guid reporterUserId,
        ReportTargetType targetType,
        Guid targetId,
        Guid targetCourseId,
        Guid targetOwnerUserId,
        string reasonCode,
        string? description,
        string? targetSnapshot,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID báo cáo không hợp lệ.");
        }

        if (reporterUserId == Guid.Empty)
        {
            return Error.Validation("ID người báo cáo không hợp lệ.");
        }

        if (targetId == Guid.Empty || targetCourseId == Guid.Empty)
        {
            return Error.Validation("ID đối tượng báo cáo không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reasonCode) || reasonCode.Trim().Length > MaxReasonCodeLength)
        {
            return Error.Validation($"Mã lý do báo cáo phải từ 1 đến {MaxReasonCodeLength} ký tự.");
        }

        return new Report(
            id,
            ReportSource.User,
            reporterUserId,
            targetType,
            targetId,
            targetCourseId,
            targetOwnerUserId,
            null,
            reasonCode.Trim().ToUpperInvariant(),
            description?.Trim(),
            targetSnapshot,
            null,
            utcNow);
    }

    public static Result<Report> CreateAiReport(
        Guid id,
        Guid aiFindingId,
        ReportTargetType targetType,
        Guid targetId,
        Guid targetCourseId,
        Guid targetOwnerUserId,
        string reasonCode,
        string? targetSnapshot,
        decimal score,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID báo cáo không hợp lệ.");
        }

        if (aiFindingId == Guid.Empty)
        {
            return Error.Validation("ID cờ AI không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(reasonCode) || reasonCode.Trim().Length > MaxReasonCodeLength)
        {
            return Error.Validation($"Mã lý do báo cáo phải từ 1 đến {MaxReasonCodeLength} ký tự.");
        }

        return new Report(
            id,
            ReportSource.Ai,
            null,
            targetType,
            targetId,
            targetCourseId,
            targetOwnerUserId,
            aiFindingId,
            reasonCode.Trim().ToUpperInvariant(),
            "AI automated moderation flag",
            targetSnapshot,
            score,
            utcNow);
    }

    public void AddEvidence(ReportEvidence evidence)
    {
        ArgumentNullException.ThrowIfNull(evidence);
        _evidences.Add(evidence);
    }

    public Result Resolve(
        ReportStatus decision,
        string reason,
        Guid adminUserId,
        DateTimeOffset utcNow)
    {
        if (Status != ReportStatus.Pending)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Báo cáo không còn ở trạng thái chờ duyệt (PENDING).");
        }

        if (decision is not (ReportStatus.Accepted or ReportStatus.Rejected))
        {
            return Error.Validation("Quyết định xử lý phải là ACCEPTED hoặc REJECTED.");
        }

        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > MaxResolutionReasonLength)
        {
            return Error.Validation($"Lý do xử lý báo cáo phải từ 1 đến {MaxResolutionReasonLength} ký tự.");
        }

        if (adminUserId == Guid.Empty)
        {
            return Error.Validation("ID quản trị viên xử lý không hợp lệ.");
        }

        Status = decision;
        ResolutionReason = reason.Trim();
        ResolvedByUserId = adminUserId;
        ResolvedAt = utcNow;

        return Result.Success();
    }
}
