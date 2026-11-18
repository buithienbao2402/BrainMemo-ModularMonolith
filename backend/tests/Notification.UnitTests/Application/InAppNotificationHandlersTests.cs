using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Notification.Application.Abstractions;
using BrainMemo.Notification.Application.EventHandlers;
using BrainMemo.Notification.Domain.Entities;
using BrainMemo.Notification.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Notification.UnitTests.Application;

public sealed class InAppNotificationHandlersTests
{
    private sealed class TestClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = now;
    }

    private sealed class InMemoryNotificationRepository : INotificationRepository
    {
        public List<NotificationItem> Items { get; } = [];

        public Task<PagedResult<NotificationItem>> ListForUserAsync(Guid recipientUserId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default)
        {
            IEnumerable<NotificationItem> filtered = Items.Where(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null);
            if (unreadOnly)
            {
                filtered = filtered.Where(n => n.ReadAt == null);
            }

            List<NotificationItem> list = filtered.OrderByDescending(n => n.CreatedAt).ToList();
            int total = list.Count;
            List<NotificationItem> paged = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<NotificationItem>(paged, page, pageSize, total));
        }

        public Task<int> GetUnreadCountAsync(Guid recipientUserId, CancellationToken ct = default) =>
            Task.FromResult(Items.Count(n => n.RecipientUserId == recipientUserId && n.DeletedAt == null && n.ReadAt == null));

        public Task<NotificationItem?> FindByIdAsync(Guid id, Guid recipientUserId, CancellationToken ct = default) =>
            Task.FromResult(Items.FirstOrDefault(n => n.Id == id && n.RecipientUserId == recipientUserId && n.DeletedAt == null));

        public Task<bool> ExistsByEventAndRecipientAsync(Guid sourceEventId, Guid recipientUserId, CancellationToken ct = default) =>
            Task.FromResult(Items.Any(n => n.SourceEventId == sourceEventId && n.RecipientUserId == recipientUserId));

        public Task<int> MarkAllAsReadAsync(Guid recipientUserId, DateTimeOffset utcNow, CancellationToken ct = default) =>
            Task.FromResult(0);

        public Task<Result> AddNotificationAsync(NotificationItem item, CancellationToken ct = default)
        {
            if (Items.Any(n => n.SourceEventId == item.SourceEventId && n.RecipientUserId == item.RecipientUserId))
            {
                return Task.FromResult(Result.Failure(Error.Conflict("NOTIFICATION_EXISTS", "Đã tồn tại")));
            }

            Items.Add(item);
            return Task.FromResult(Result.Success());
        }

        public Task<Result> SaveChangesAsync(CancellationToken ct = default) => Task.FromResult(Result.Success());
    }

    private sealed class FakeCourseContract : ICourseContract
    {
        public Guid OwnerId { get; set; } = Guid.NewGuid();
        public List<Guid> ActiveLearnerIds { get; set; } = [];

        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal) =>
            Result.Success(new CourseAccessDto(
                Exists: true,
                EffectiveState: "ACTIVE",
                AccessMode: "PUBLIC",
                OwnerUserId: OwnerId,
                IsOwner: viewerUserId == OwnerId,
                EnrollmentStatus: "ACTIVE",
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: true,
                ReasonCode: "OK"));

        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId) =>
            Result.Success(new ChapterAccessResult(true, true, "OK"));

        public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId) =>
            Result.Success<IReadOnlyList<CourseSummaryDto>>([]);

        public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit) =>
            Result.Success(new Page<CourseSummaryDto>([], null, false));

        public Result<BrainMemo.Course.Contracts.Dtos.ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId) =>
            Result.Failure<BrainMemo.Course.Contracts.Dtos.ReportTargetDto>(Error.NotFound("Not found"));

        public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId) => Result.Success();
        public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor) => Result.Success();
        public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId) => Result.Success("Test");

        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) =>
            Result.Success(new Page<Guid>(ActiveLearnerIds, null, false));

        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => Result.Success(new Page<CourseSnapshotDto>([], null, false));
        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => Result.Success(new Page<EnrollmentFactDto>([], null, false));
        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => Result.Success(new Page<NominationFactDto>([], null, false));
    }

    private sealed class FakeLearningContract : ILearningContract
    {
        public Dictionary<Guid, BrainMemo.Learning.Contracts.Dtos.ReportTargetDto> Targets { get; } = [];

        public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId) => Result.Failure<CourseProgressDto>(Error.NotFound("Not found"));
        public Result<bool> IsBlockCompleted(Guid userId, Guid blockId) => Result.Success(false);
        public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId) => Result.Failure<QuizAttemptSummaryDto>(Error.NotFound("Not found"));
        public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId) => Result.Failure<AttemptForGradingDto>(Error.NotFound("Not found"));
        public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback) => Result.Success();
        public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit) => Result.Success(new Page<Guid>([], null, false));
        public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId) => Result.Failure<AssignmentSubmissionDto>(Error.NotFound("Not found"));
        public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt) => Result.Success();

        public Result<BrainMemo.Learning.Contracts.Dtos.ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId)
        {
            if (Targets.TryGetValue(commentId, out var target))
            {
                return Result.Success(target);
            }
            return Result.Failure<BrainMemo.Learning.Contracts.Dtos.ReportTargetDto>(Error.NotFound("Bình luận không tồn tại."));
        }

        public Result SoftDeleteComment(Guid commentId, Guid actorAdminId) => Result.Success();
        public Result RestoreComment(Guid commentId, Guid actorAdminId) => Result.Success();
        public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId) => Result.Success(new CourseLearningStatsDto(0, 0));
    }

    [Fact]
    public async Task EnrollmentChanged_CreatesNotification_AndIsIdempotent()
    {
        InMemoryNotificationRepository repo = new();
        TestClock clock = new(DateTimeOffset.UtcNow);
        EnrollmentChangedEventHandler handler = new(repo, clock, NullLogger<EnrollmentChangedEventHandler>.Instance);

        Guid eventId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        Guid studentId = Guid.NewGuid();

        EnrollmentChanged evt = new(
            EventId: eventId,
            OccurredAt: clock.UtcNow,
            CourseId: courseId,
            OwnerUserId: ownerId,
            UserId: studentId,
            Action: "INVITED",
            FromStatus: null,
            ToStatus: "INVITED");

        // First handling
        await handler.HandleAsync(evt);
        Assert.Single(repo.Items);
        Assert.Equal(studentId, repo.Items[0].RecipientUserId);
        Assert.Equal(NotificationType.EnrollmentInviteJoin, repo.Items[0].Type);

        // Second handling (duplicate event)
        await handler.HandleAsync(evt);
        Assert.Single(repo.Items); // Did not add duplicate!
    }

    [Fact]
    public async Task CommentCreated_RootComment_NotifiesOwner_AndSkipsIfAuthorIsOwner()
    {
        InMemoryNotificationRepository repo = new();
        TestClock clock = new(DateTimeOffset.UtcNow);
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();

        Guid ownerId = Guid.NewGuid();
        courseContract.OwnerId = ownerId;

        CommentCreatedEventHandler handler = new(
            courseContract,
            learningContract,
            repo,
            clock,
            NullLogger<CommentCreatedEventHandler>.Instance);

        Guid eventId1 = Guid.NewGuid();
        Guid commenterId = Guid.NewGuid();

        CommentCreated evtStudent = new(
            EventId: eventId1,
            OccurredAt: clock.UtcNow,
            CommentId: Guid.NewGuid(),
            CourseId: Guid.NewGuid(),
            ChapterId: null,
            AuthorUserId: commenterId,
            ParentCommentId: null,
            Content: "Bài giảng rất hay!");

        await handler.HandleAsync(evtStudent);
        Assert.Single(repo.Items);
        Assert.Equal(ownerId, repo.Items[0].RecipientUserId);
        Assert.Equal(NotificationType.Comment, repo.Items[0].Type);

        // When Course Owner is the one commenting, do NOT notify the owner
        Guid eventId2 = Guid.NewGuid();
        CommentCreated evtOwner = new(
            EventId: eventId2,
            OccurredAt: clock.UtcNow,
            CommentId: Guid.NewGuid(),
            CourseId: Guid.NewGuid(),
            ChapterId: null,
            AuthorUserId: ownerId,
            ParentCommentId: null,
            Content: "Cảm ơn các bạn!");

        await handler.HandleAsync(evtOwner);
        Assert.Single(repo.Items); // Still 1 item, no self-notification
    }

    [Fact]
    public async Task CommentCreated_ReplyComment_NotifiesParentAuthor()
    {
        InMemoryNotificationRepository repo = new();
        TestClock clock = new(DateTimeOffset.UtcNow);
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();

        Guid ownerId = Guid.NewGuid();
        Guid parentAuthorId = Guid.NewGuid();
        Guid replyAuthorId = Guid.NewGuid();
        Guid parentCommentId = Guid.NewGuid();

        courseContract.OwnerId = ownerId;
        learningContract.Targets[parentCommentId] = new BrainMemo.Learning.Contracts.Dtos.ReportTargetDto(
            CommentId: parentCommentId,
            CourseId: Guid.NewGuid(),
            ChapterId: null,
            AuthorUserId: parentAuthorId,
            Content: "Câu hỏi 1?");

        CommentCreatedEventHandler handler = new(
            courseContract,
            learningContract,
            repo,
            clock,
            NullLogger<CommentCreatedEventHandler>.Instance);

        CommentCreated replyEvt = new(
            EventId: Guid.NewGuid(),
            OccurredAt: clock.UtcNow,
            CommentId: Guid.NewGuid(),
            CourseId: Guid.NewGuid(),
            ChapterId: null,
            AuthorUserId: replyAuthorId,
            ParentCommentId: parentCommentId,
            Content: "Đáp án đây bạn ơi!");

        await handler.HandleAsync(replyEvt);

        // Both parent author and course owner should be notified
        Assert.Equal(2, repo.Items.Count);
        Assert.Contains(repo.Items, n => n.RecipientUserId == parentAuthorId);
        Assert.Contains(repo.Items, n => n.RecipientUserId == ownerId);
    }

    [Fact]
    public async Task ChapterPublished_WhenFirstPublish_NotifiesActiveLearners()
    {
        InMemoryNotificationRepository repo = new();
        TestClock clock = new(DateTimeOffset.UtcNow);
        FakeCourseContract courseContract = new();

        Guid learner1 = Guid.NewGuid();
        Guid learner2 = Guid.NewGuid();
        courseContract.ActiveLearnerIds = [learner1, learner2];

        ChapterPublishedEventHandler handler = new(
            courseContract,
            repo,
            clock,
            NullLogger<ChapterPublishedEventHandler>.Instance);

        Guid eventId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();

        // 1. Not first publish -> Should NOT notify
        ChapterPublished secondPublish = new(
            EventId: eventId,
            OccurredAt: clock.UtcNow,
            ChapterId: chapterId,
            CourseId: courseId,
            VersionNo: 2,
            IsFirstPublish: false,
            AddedBlockIds: [],
            RemovedBlockIds: []);

        await handler.HandleAsync(secondPublish);
        Assert.Empty(repo.Items);

        // 2. Is first publish -> Notifies learners
        ChapterPublished firstPublish = new(
            EventId: eventId,
            OccurredAt: clock.UtcNow,
            ChapterId: chapterId,
            CourseId: courseId,
            VersionNo: 1,
            IsFirstPublish: true,
            AddedBlockIds: [],
            RemovedBlockIds: []);

        await handler.HandleAsync(firstPublish);
        Assert.Equal(2, repo.Items.Count);
        Assert.Contains(repo.Items, n => n.RecipientUserId == learner1);
        Assert.Contains(repo.Items, n => n.RecipientUserId == learner2);
        Assert.All(repo.Items, n => Assert.Equal(NotificationType.NewChapter, n.Type));
    }
}
