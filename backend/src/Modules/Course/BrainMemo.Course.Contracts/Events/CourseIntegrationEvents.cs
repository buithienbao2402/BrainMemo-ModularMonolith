using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Course.Contracts.Events;

/// <summary>
/// Emitted via crs_outbox_event whenever a course is created, updated, soft deleted, hidden, or restored.
/// CRITICAL RULE (D18): When Eligible is false, Name, Description, Tags, and other content fields MUST be null.
/// </summary>
public sealed record CourseUpserted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    bool Eligible,
    uint Revision,
    string? Name = null,
    string? Description = null,
    string? AccessMode = null,
    string? Status = null,
    IReadOnlyList<string>? Tags = null,
    Guid? OwnerUserId = null) : IntegrationEvent(EventId, OccurredAt);

public sealed record CoursePermanentlyDeleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    string CourseName,
    Guid OwnerUserId,
    Guid ActorAdminId) : IntegrationEvent(EventId, OccurredAt);

public sealed record EnrollmentChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    Guid UserId,
    string PreviousStatus,
    string NewStatus) : IntegrationEvent(EventId, OccurredAt);

public sealed record NominationChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    Guid UserId,
    bool IsActive) : IntegrationEvent(EventId, OccurredAt);
