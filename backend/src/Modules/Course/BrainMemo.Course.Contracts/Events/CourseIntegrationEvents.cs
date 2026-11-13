using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Course.Contracts.Events;

public sealed record CourseUpserted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    int Revision,
    bool Eligible,
    IReadOnlyList<string> ChangedFields,
    Guid? OwnerUserId = null,
    string? Name = null,
    string? Description = null,
    string? CoverStorageKey = null,
    string? AccessMode = null,
    string? Status = null,
    IReadOnlyList<string>? Tags = null,
    DateTimeOffset? CreatedAt = null,
    DateTimeOffset? UpdatedAt = null) : IntegrationEvent(EventId, OccurredAt);

public sealed record CoursePermanentlyDeleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    string? CoverStorageKey = null) : IntegrationEvent(EventId, OccurredAt);

public sealed record EnrollmentChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    Guid OwnerUserId,
    Guid UserId,
    string Action,
    string FromStatus,
    string ToStatus,
    bool IsFirstActivation) : IntegrationEvent(EventId, OccurredAt);

public sealed record NominationChanged(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CourseId,
    Guid UserId,
    string Action) : IntegrationEvent(EventId, OccurredAt);
