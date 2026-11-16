using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Moderation.Contracts.Events;

public sealed record SanctionEventItemDto(
    Guid SanctionId,
    string Type,
    Guid TargetId,
    string Reason,
    DateTimeOffset? ExpiresAt);

/// <summary>
/// Emitted after commit when an admin resolves a moderation report (contracts/moderation.md §10).
/// </summary>
public sealed record ReportResolved(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ReportId,
    string Source,
    string Decision,
    string Reason,
    Guid? ReporterUserId,
    Guid ReportedUserId,
    IReadOnlyList<SanctionEventItemDto> Sanctions) : IntegrationEvent(EventId, OccurredAt);

/// <summary>
/// Emitted after commit when a direct sanction is applied without an underlying report (contracts/moderation.md §10).
/// </summary>
public sealed record SanctionApplied(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid SanctionId,
    Guid SubjectUserId,
    string Type,
    string Reason,
    DateTimeOffset? ExpiresAt) : IntegrationEvent(EventId, OccurredAt);
