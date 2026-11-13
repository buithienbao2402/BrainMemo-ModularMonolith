using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Content.Contracts.Events;

public sealed record ChapterPublished(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ChapterId,
    Guid CourseId,
    int VersionNo,
    bool IsFirstPublish,
    IReadOnlyList<Guid> AddedBlockIds,
    IReadOnlyList<Guid> RemovedBlockIds) : IntegrationEvent(EventId, OccurredAt);

public sealed record ChapterDeleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ChapterId,
    Guid CourseId,
    bool WasPublished) : IntegrationEvent(EventId, OccurredAt);
