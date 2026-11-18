using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Commands.LeaveCourse;
using BrainMemo.Course.Application.Commands.NominateCourse;
using BrainMemo.Course.Application.Commands.WithdrawNomination;
using BrainMemo.Course.Application.Queries.GetCourseStats;
using BrainMemo.Course.Application.Queries.GetNominationSummary;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;
using CourseStatus = BrainMemo.Course.Domain.Enums.CourseStatus;
using EnrollmentStatus = BrainMemo.Course.Domain.Enums.EnrollmentStatus;
using LearningReportTargetDto = BrainMemo.Learning.Contracts.Dtos.ReportTargetDto;

namespace Course.UnitTests;

public sealed class CourseNominationAndStatsTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid OwnerId = Guid.NewGuid();
    private static readonly Guid LearnerId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    [Fact]
    public async Task NominateCourse_WhenActiveLearner_CreatesNominationAndEmitsEvent()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, null, Now));

        var handler = new NominateCourseCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new NominateCourseCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(repo.Nominations);
        var nomination = repo.Nominations[0];
        Assert.Equal(course.Id, nomination.CourseId);
        Assert.Equal(LearnerId, nomination.UserId);
        Assert.Null(nomination.WithdrawnAt);
        Assert.True(nomination.IsActive);

        Assert.Single(outbox.Events);
        var evt = Assert.IsType<NominationChanged>(outbox.Events[0]);
        Assert.Equal(course.Id, evt.CourseId);
        Assert.Equal(LearnerId, evt.UserId);
        Assert.True(evt.IsActive);
    }

    [Fact]
    public async Task NominateCourse_WhenOwner_AllowsNomination()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);

        var handler = new NominateCourseCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new NominateCourseCommand(course.Id, OwnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(repo.Nominations);
        Assert.Equal(OwnerId, repo.Nominations[0].UserId);
    }

    [Fact]
    public async Task NominateCourse_WhenNotEnrolled_FailsWithNotEligible()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);

        var handler = new NominateCourseCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new NominateCourseCommand(course.Id, OtherUserId), CancellationToken.None);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("NOT_ELIGIBLE_TO_NOMINATE", result.Error.Code);
        Assert.Empty(repo.Nominations);
        Assert.Empty(outbox.Events);
    }

    [Fact]
    public async Task NominateCourse_WhenAlreadyNominated_IsIdempotentAndDoesNotDuplicate()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, null, Now));
        repo.Nominations.Add(new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now));

        var handler = new NominateCourseCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new NominateCourseCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(repo.Nominations); // Still only 1 nomination
        Assert.Empty(outbox.Events); // No duplicate event
    }

    [Fact]
    public async Task WithdrawNomination_WhenHasActiveNomination_SetsWithdrawnAtAndEmitsEvent()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now.AddHours(2));
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        var nomination = new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now);
        repo.Nominations.Add(nomination);

        var handler = new WithdrawNominationCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new WithdrawNominationCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(nomination.WithdrawnAt);
        Assert.Equal(clock.UtcNow, nomination.WithdrawnAt);
        Assert.False(nomination.IsActive);

        Assert.Single(outbox.Events);
        var evt = Assert.IsType<NominationChanged>(outbox.Events[0]);
        Assert.Equal(course.Id, evt.CourseId);
        Assert.Equal(LearnerId, evt.UserId);
        Assert.False(evt.IsActive);
    }

    [Fact]
    public async Task WithdrawNomination_WhenNoActiveNomination_IsIdempotent()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);

        var handler = new WithdrawNominationCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new WithdrawNominationCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Empty(outbox.Events);
    }

    [Fact]
    public async Task NominateCourse_WhenRenominatingAfterWithdrawal_InsertsNewRow()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now.AddDays(1));
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, null, Now));

        var oldNomination = new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now);
        oldNomination.Withdraw(Now.AddHours(1));
        repo.Nominations.Add(oldNomination);

        var handler = new NominateCourseCommandHandler(repo, outbox, clock);

        // Act
        var result = await handler.Handle(new NominateCourseCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(2, repo.Nominations.Count); // 1 withdrawn, 1 new active
        var active = repo.Nominations.FirstOrDefault(n => n.IsActive);
        Assert.NotNull(active);
        Assert.NotEqual(oldNomination.Id, active.Id);
        Assert.Equal(clock.UtcNow, active.NominatedAt);
    }

    [Fact]
    public async Task LeaveCourse_PreservesActiveNomination_GiuKhiRoiKhoa()
    {
        // Acceptance criterion: Đề cử giữ nguyên khi rời khóa
        // Arrange
        var repo = new FakeCourseRepo();
        var outbox = new FakeOutbox();
        var clock = new FakeClock(Now);
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, null, Now));
        var nomination = new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now);
        repo.Nominations.Add(nomination);

        var leaveHandler = new LeaveCourseCommandHandler(repo, outbox, clock);

        // Act
        var leaveResult = await leaveHandler.Handle(new LeaveCourseCommand(course.Id, LearnerId), CancellationToken.None);

        // Assert
        Assert.True(leaveResult.IsSuccess);
        var activeNomination = await repo.GetActiveNominationAsync(course.Id, LearnerId);
        Assert.NotNull(activeNomination);
        Assert.True(activeNomination.IsActive);
        Assert.Null(activeNomination.WithdrawnAt);
    }

    [Fact]
    public async Task GetCourseStats_AggregatesCourseContentAndLearningStats()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, null, Now));
        repo.Enrollments.Add(new Enrollment(Guid.NewGuid(), course.Id, OtherUserId, EnrollmentStatus.Active, null, Now));
        repo.Nominations.Add(new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now));

        var fakeContent = new FakeContentContract(publishedChapterCount: 5);
        var fakeLearning = new FakeLearningContract(completedLearnerCount: 1, commentCount: 12);

        var handler = new GetCourseStatsQueryHandler(repo, fakeContent, fakeLearning);

        // Act
        var result = await handler.Handle(new GetCourseStatsQuery(course.Id, OwnerId), CancellationToken.None);

        // Assert
        Assert.True(result.IsSuccess);
        var stats = result.Value;
        Assert.Equal(2, stats.ActiveLearners);
        Assert.Equal(1, stats.CompletedLearners);
        Assert.Equal(50.0, stats.CompletionRate);
        Assert.Equal(12, stats.CommentCount);
        Assert.Equal(5, stats.ChapterCount);
        Assert.Equal(1, stats.NominationCount);
    }

    [Fact]
    public async Task GetNominationSummary_ReturnsCountAndHasNominated()
    {
        // Arrange
        var repo = new FakeCourseRepo();
        var course = CreateTestCourse();
        repo.Courses.Add(course);
        repo.Nominations.Add(new Nomination(Guid.NewGuid(), course.Id, LearnerId, Now));

        var handler = new GetNominationSummaryQueryHandler(repo);

        // Act - as learner who nominated
        var learnerSummary = await handler.Handle(new GetNominationSummaryQuery(course.Id, LearnerId), CancellationToken.None);
        // Act - as anonymous
        var anonSummary = await handler.Handle(new GetNominationSummaryQuery(course.Id, null), CancellationToken.None);

        // Assert
        Assert.True(learnerSummary.IsSuccess);
        Assert.Equal(1, learnerSummary.Value.NominationCount);
        Assert.True(learnerSummary.Value.HasNominated);

        Assert.True(anonSummary.IsSuccess);
        Assert.Equal(1, anonSummary.Value.NominationCount);
        Assert.False(anonSummary.Value.HasNominated);
    }

    private static CourseEntity CreateTestCourse()
    {
        return CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "C# Nâng Cao",
            "Mô tả khóa học",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            ["csharp"],
            Now).Value;
    }

    #region Fakes

    private sealed class FakeClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; } = now;
    }

    private sealed class FakeOutbox : IOutboxWriter
    {
        public List<IntegrationEvent> Events { get; } = [];

        public Task WriteAsync(string moduleName, Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            Events.Add(@event);
            return Task.CompletedTask;
        }

        public Task WriteAsync(Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            Events.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeContentContract(int publishedChapterCount) : IContentContract
    {
        public Result<int> CountPublishedChapters(Guid courseId) => Result.Success(publishedChapterCount);
        public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds) => throw new NotImplementedException();
        public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId) => throw new NotImplementedException();
        public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) => throw new NotImplementedException();
        public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId) => throw new NotImplementedException();
        public Result VerifyQuizPassword(Guid quizBlockId, string password) => throw new NotImplementedException();
        public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId) => throw new NotImplementedException();
        public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId) => throw new NotImplementedException();
        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) => throw new NotImplementedException();
        public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => throw new NotImplementedException();
        public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer) => throw new NotImplementedException();
        public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items) => throw new NotImplementedException();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards) => throw new NotImplementedException();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => throw new NotImplementedException();
    }

    private sealed class FakeLearningContract(int completedLearnerCount, int commentCount) : ILearningContract
    {
        public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId) =>
            Result.Success(new CourseLearningStatsDto(completedLearnerCount, commentCount));

        public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<bool> IsBlockCompleted(Guid userId, Guid blockId) => throw new NotImplementedException();
        public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId) => throw new NotImplementedException();
        public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId) => throw new NotImplementedException();
        public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback) => throw new NotImplementedException();
        public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId) => throw new NotImplementedException();
        public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt) => throw new NotImplementedException();
        public Result<LearningReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId) => throw new NotImplementedException();
        public Result SoftDeleteComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
        public Result RestoreComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
    }

    private sealed class FakeCourseRepo : ICourseRepository
    {
        public List<CourseEntity> Courses { get; } = [];
        public List<Enrollment> Enrollments { get; } = [];
        public List<Nomination> Nominations { get; } = [];

        public Task AddAsync(CourseEntity course, CancellationToken ct = default)
        {
            Courses.Add(course);
            return Task.CompletedTask;
        }

        public Task<CourseEntity?> GetByIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Courses.FirstOrDefault(c => c.Id == courseId));

        public Task<CourseEntity?> GetByIdWithTagsAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Courses.FirstOrDefault(c => c.Id == courseId));

        public Task<IReadOnlyList<CourseEntity>> GetSummariesAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<CourseEntity>>(Courses.Where(c => courseIds.Contains(c.Id)).ToList());

        public Task<Enrollment?> GetEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Enrollments.FirstOrDefault(e => e.CourseId == courseId && e.UserId == userId));

        public Task AddEnrollmentAsync(Enrollment enrollment, CancellationToken ct = default)
        {
            Enrollments.Add(enrollment);
            return Task.CompletedTask;
        }

        public Task RemoveEnrollmentAsync(Enrollment enrollment, CancellationToken ct = default)
        {
            Enrollments.Remove(enrollment);
            return Task.CompletedTask;
        }

        public Task<EnrollmentRequest?> GetPendingEnrollmentRequestAsync(Guid courseId, Guid userId, CancellationToken ct = default) => Task.FromResult<EnrollmentRequest?>(null);
        public Task<EnrollmentRequest?> GetEnrollmentRequestByIdAsync(Guid requestId, CancellationToken ct = default) => Task.FromResult<EnrollmentRequest?>(null);
        public Task AddEnrollmentRequestAsync(EnrollmentRequest request, CancellationToken ct = default) => Task.CompletedTask;
        public Task<PagedResult<Enrollment>> ListEnrollmentsPagedAsync(Guid courseId, BrainMemo.Course.Domain.Enums.EnrollmentStatus? status, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(new PagedResult<Enrollment>([], page, pageSize, 0));
        public Task<IReadOnlyList<Enrollment>> ListUserInvitationsAsync(Guid userId, CancellationToken ct = default) => Task.FromResult<IReadOnlyList<Enrollment>>([]);
        public Task<PagedResult<EnrollmentRequest>> ListEnrollmentRequestsPagedAsync(Guid courseId, EnrollmentDecision? decision, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(new PagedResult<EnrollmentRequest>([], page, pageSize, 0));
        public Task<ChapterAccess?> GetChapterAccessAsync(Guid chapterId, CancellationToken ct = default) => Task.FromResult<ChapterAccess?>(null);
        public Task AddChapterAccessAsync(ChapterAccess access, CancellationToken ct = default) => Task.CompletedTask;
        public Task RemoveChapterAccessAsync(ChapterAccess access, CancellationToken ct = default) => Task.CompletedTask;
        public Task<ChapterUnlock?> GetChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default) => Task.FromResult<ChapterUnlock?>(null);
        public Task AddChapterUnlockAsync(ChapterUnlock unlock, CancellationToken ct = default) => Task.CompletedTask;
        public Task RemoveChapterUnlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default) => Task.CompletedTask;

        public Task<bool> HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Nominations.Any(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null));

        public Task<Nomination?> GetActiveNominationAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Nominations.FirstOrDefault(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null));

        public Task AddNominationAsync(Nomination nomination, CancellationToken ct = default)
        {
            Nominations.Add(nomination);
            return Task.CompletedTask;
        }

        public Task<CourseStatsDto> GetCourseStatsAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(new CourseStatsDto(0, 0, 0, 0, 0, 0));

        public Task<int> GetLearnerCountAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Enrollments.Count(e => e.CourseId == courseId && e.Status == BrainMemo.Course.Domain.Enums.EnrollmentStatus.Active));

        public Task<int> GetNominationCountAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Nominations.Count(n => n.CourseId == courseId && n.WithdrawnAt == null));

        public Task<Page<CourseEntity>> ListUserCoursesAsync(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit, CancellationToken ct = default) => Task.FromResult(Page<CourseEntity>.Empty());
        public Task<PagedResult<CourseEntity>> ListProfileCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));
        public Task<PagedResult<CourseEntity>> ListMyOwnedCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));
        public Task<PagedResult<CourseEntity>> ListMyEnrolledCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) => Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));
        public Task<Page<Guid>> ListActiveLearnerIdsAsync(Guid courseId, Guid? afterId, int limit, CancellationToken ct = default) => Task.FromResult(Page<Guid>.Empty());
        public Task<Page<CourseSnapshotDto>> ListCourseSnapshotsAsync(Guid? afterId, int limit, CancellationToken ct = default) => Task.FromResult(Page<CourseSnapshotDto>.Empty());
        public Task<Page<EnrollmentFactDto>> ListEnrollmentFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) => Task.FromResult(Page<EnrollmentFactDto>.Empty());
        public Task<Page<NominationFactDto>> ListNominationFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) => Task.FromResult(Page<NominationFactDto>.Empty());
        public Task DeletePermanentlyAsync(CourseEntity course, CancellationToken ct = default) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion
}
