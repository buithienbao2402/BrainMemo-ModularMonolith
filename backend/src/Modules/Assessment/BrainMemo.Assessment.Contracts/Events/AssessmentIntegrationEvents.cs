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

public sealed record CourseReviewCreated(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ReviewId,
    Guid CourseId,
    Guid UserId,
    int Rating,
    string? CommentText,
    decimal? AvgRating,
    int ReviewCount) : IntegrationEvent(EventId, OccurredAt);

public sealed record CourseReviewUpdated(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ReviewId,
    Guid CourseId,
    Guid UserId,
    int OldRating,
    int NewRating,
    string? CommentText,
    decimal? AvgRating,
    int ReviewCount) : IntegrationEvent(EventId, OccurredAt);

public sealed record CourseReviewReplied(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid ReviewId,
    Guid CourseId,
    Guid ReviewUserId,
    Guid InstructorUserId,
    string ReplyText) : IntegrationEvent(EventId, OccurredAt);
