using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Learning.Contracts.Events;

public sealed record BlockCompleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid CourseId,
    Guid ChapterId,
    Guid? BlockId) : IntegrationEvent(EventId, OccurredAt);

public sealed record ChapterCompleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid CourseId,
    Guid ChapterId) : IntegrationEvent(EventId, OccurredAt);

public sealed record CourseCompleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid CourseId) : IntegrationEvent(EventId, OccurredAt);

public sealed record QuizAttemptStarted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid AttemptId,
    Guid UserId,
    Guid QuizBlockId,
    DateTimeOffset DeadlineAt) : IntegrationEvent(EventId, OccurredAt);

public sealed record QuizAttemptSubmitted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid AttemptId,
    Guid UserId,
    Guid CourseId,
    Guid ChapterId,
    Guid BlockId,
    Guid QuizBlockId,
    DateTimeOffset SubmittedAt,
    bool AutoSubmitted) : IntegrationEvent(EventId, OccurredAt);

public sealed record AssignmentSubmitted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid SubmissionId,
    Guid UserId,
    Guid AssignmentBlockId,
    DateTimeOffset SubmittedAt,
    bool IsLate) : IntegrationEvent(EventId, OccurredAt);

public sealed record CommentCreated(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CommentId,
    Guid CourseId,
    Guid? ChapterId,
    Guid AuthorUserId,
    Guid? ParentCommentId,
    string Content) : IntegrationEvent(EventId, OccurredAt);

public sealed record CommentDeleted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid CommentId,
    Guid DeletedByUserId,
    string? Reason) : IntegrationEvent(EventId, OccurredAt);
