using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Assessment.Contracts.Events;

public sealed record GradeRecordedIntegrationEvent(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid GradeRecordId,
    Guid UserId,
    Guid CourseId,
    Guid ComponentId,
    string RecordType,
    Guid? SourceAttemptId,
    Guid? SourceSubmissionId,
    decimal? Score,
    decimal? MaxScore,
    bool IsFullyGraded,
    DateTimeOffset GradedAt) : IntegrationEvent(EventId, OccurredAt);
