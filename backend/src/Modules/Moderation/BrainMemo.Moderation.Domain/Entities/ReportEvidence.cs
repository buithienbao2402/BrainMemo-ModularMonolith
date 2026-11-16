using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Moderation.Domain.Entities;

public sealed class ReportEvidence : Entity
{
    private ReportEvidence()
    {
    }

    private ReportEvidence(
        Guid id,
        Guid reportId,
        EvidenceKind kind,
        string? storageKey,
        string? url,
        DateTimeOffset createdAt) : base(id)
    {
        ReportId = reportId;
        Kind = kind;
        StorageKey = storageKey;
        Url = url;
        CreatedAt = createdAt;
    }

    public Guid ReportId { get; private set; }

    public EvidenceKind Kind { get; private set; }

    public string? StorageKey { get; private set; }

    public string? Url { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public static Result<ReportEvidence> CreateImage(
        Guid id,
        Guid reportId,
        string storageKey,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID bằng chứng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(storageKey))
        {
            return Error.Validation("Khóa tệp ảnh bằng chứng không được để trống.");
        }

        return new ReportEvidence(id, reportId, EvidenceKind.Image, storageKey.Trim(), null, utcNow);
    }

    public static Result<ReportEvidence> CreateLink(
        Guid id,
        Guid reportId,
        string url,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID bằng chứng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(url))
        {
            return Error.Validation("Đường dẫn liên kết bằng chứng không được để trống.");
        }

        return new ReportEvidence(id, reportId, EvidenceKind.Link, null, url.Trim(), utcNow);
    }
}
