using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Commands.AcceptInvitation;
using BrainMemo.Course.Application.Commands.DecideEnrollmentRequest;
using BrainMemo.Course.Application.Commands.EnrollCourse;
using BrainMemo.Course.Application.Commands.InviteLearner;
using BrainMemo.Course.Application.Commands.LeaveCourse;
using BrainMemo.Course.Application.Commands.RemoveLearner;
using BrainMemo.Course.Application.Commands.SetChapterAccess;
using BrainMemo.Course.Application.Commands.UnlockChapter;
using BrainMemo.Course.Application.EventHandlers;
using BrainMemo.Course.Application.Queries.GetChapterAccess;
using BrainMemo.Course.Application.Queries.ListEnrollmentRequests;
using BrainMemo.Course.Application.Queries.ListEnrollments;
using BrainMemo.Course.Application.Queries.ListMyInvitations;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Course.Infrastructure.Security;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace Course.UnitTests;

public sealed class CourseEnrollmentAndAccessTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid OwnerId = Guid.NewGuid();
    private static readonly Guid LearnerId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    #region Helpers & Test Fakes

    private static CourseEntity CreateTestCourse(CourseAccessMode mode = CourseAccessMode.Public, Guid? owner = null)
    {
        Guid courseId = Guid.NewGuid();
        Guid courseOwner = owner ?? OwnerId;
        Result<CourseEntity> result = CourseEntity.Create(
            courseId,
            courseOwner,
            "Khóa học kiểm thử",
            "Mô tả kiểm thử",
            null,
            mode,
            CourseStatus.Updating,
            ["tag1"],
            Now);
        return result.Value;
    }

    private sealed class FakeClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }

    private sealed class FakeOutboxWriter : IOutboxWriter
    {
        public List<IntegrationEvent> EnqueuedMessages { get; } = [];

        public Task WriteAsync(string moduleName, Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            EnqueuedMessages.Add(@event);
            return Task.CompletedTask;
        }

        public Task WriteAsync(Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            EnqueuedMessages.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeIdentityContract(Dictionary<string, Guid>? emailMap = null) : IIdentityContract
    {
        private readonly Dictionary<string, Guid> _emails = emailMap ?? new(StringComparer.OrdinalIgnoreCase);

        public void AddEmail(string email, Guid userId) => _emails[email] = userId;

        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default)
        {
            return Task.FromResult<Result<Guid?>>(
                _emails.TryGetValue(email, out Guid userId) ? Result.Success<Guid?>(userId) : Result.Success<Guid?>(null));
        }

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(new AccountStatusDto("Active", null, null, true)));

        public Task<Result<UserSummaryDto>> GetUserSummary(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(new UserSummaryDto(userId, "ACTIVE", Now, "user@test.vn")));

        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            IReadOnlyList<UserSummaryDto> list = userIds.Select(id => new UserSummaryDto(id, "ACTIVE", Now, "user@test.vn")).ToList();
            return Task.FromResult(Result.Success(list));
        }

        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(false));
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(false));

        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(Page<Guid>.Empty()));

        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success());

        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success());
    }

    private sealed class FakeProfileContract : IProfileContract
    {
        public Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(Result.Success(new PublicProfileDto(
                userId,
                "Học viên Test",
                "https://avatar.url/avatar.png",
                "Bio",
                Now,
                true)));
        }

        public Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            IReadOnlyList<DisplayInfoDto> list = userIds.Select(id => new DisplayInfoDto(id, "Học viên Test", null)).ToList();
            return Task.FromResult(Result.Success(list));
        }
    }

    private sealed class FakeContentContract : BrainMemo.Content.Contracts.IContentContract
    {
        private readonly Dictionary<Guid, Guid> _chapters = [];

        public void AddChapter(Guid chapterId, Guid courseId) => _chapters[chapterId] = courseId;

        public Result<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds)
        {
            var list = chapterIds
                .Where(_chapters.ContainsKey)
                .Select(id => new BrainMemo.Content.Contracts.Dtos.ChapterInfoDto(
                    id,
                    _chapters[id],
                    1,
                    "Chương kiểm thử",
                    null,
                    "PUBLISHED",
                    1,
                    1,
                    Now,
                    Now))
                .ToList();
            return Result.Success<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.ChapterInfoDto>>(list);
        }

        public Result<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.ChapterInfoDto>> ListPublishedChapters(Guid courseId) =>
            Result.Success<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.ChapterInfoDto>>([]);

        public Result<int> CountPublishedChapters(Guid courseId) => Result.Success(0);
        public Result<BrainMemo.Content.Contracts.Dtos.PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId) => throw new NotImplementedException();
        public Result<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.PublishedBlockRef> GetPublishedBlock(Guid blockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.AssessableBlockDto>> GetAssessableBlocks(Guid courseId) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId) => throw new NotImplementedException();
        public Result VerifyQuizPassword(Guid quizBlockId, string password) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<BrainMemo.Content.Contracts.Dtos.QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, BrainMemo.Content.Contracts.Dtos.AnswerPayload answer) => throw new NotImplementedException();
        public Result<BrainMemo.Content.Contracts.Dtos.ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<BrainMemo.Content.Contracts.Dtos.AiQuestionItem> items) => throw new NotImplementedException();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<BrainMemo.Content.Contracts.Dtos.Flashcard> cards) => throw new NotImplementedException();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => throw new NotImplementedException();
    }

    private sealed class FakeCourseRepository : ICourseRepository
    {
        public List<CourseEntity> Courses { get; } = [];
        public List<Enrollment> Enrollments { get; } = [];
        public List<EnrollmentRequest> EnrollmentRequests { get; } = [];
        public List<ChapterAccess> ChapterAccesses { get; } = [];
        public List<ChapterUnlock> ChapterUnlocks { get; } = [];
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

        public Task<EnrollmentRequest?> GetPendingEnrollmentRequestAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(EnrollmentRequests.FirstOrDefault(r => r.CourseId == courseId && r.UserId == userId && r.Decision == EnrollmentDecision.Pending));

        public Task<EnrollmentRequest?> GetEnrollmentRequestByIdAsync(Guid requestId, CancellationToken ct = default) =>
            Task.FromResult(EnrollmentRequests.FirstOrDefault(r => r.Id == requestId));

        public Task AddEnrollmentRequestAsync(EnrollmentRequest request, CancellationToken ct = default)
        {
            EnrollmentRequests.Add(request);
            return Task.CompletedTask;
        }

        public Task<PagedResult<Enrollment>> ListEnrollmentsPagedAsync(
            Guid courseId,
            BrainMemo.Course.Domain.Enums.EnrollmentStatus? status,
            int page,
            int pageSize,
            CancellationToken ct = default)
        {
            var query = Enrollments.Where(e => e.CourseId == courseId);
            if (status.HasValue) query = query.Where(e => e.Status == status.Value);
            var list = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<Enrollment>(list, page, pageSize, query.Count()));
        }

        public Task<IReadOnlyList<Enrollment>> ListUserInvitationsAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Enrollment>>(Enrollments.Where(e => e.UserId == userId && e.Status == BrainMemo.Course.Domain.Enums.EnrollmentStatus.Invited).ToList());

        public Task<PagedResult<EnrollmentRequest>> ListEnrollmentRequestsPagedAsync(
            Guid courseId,
            EnrollmentDecision? decision,
            int page,
            int pageSize,
            CancellationToken ct = default)
        {
            var query = EnrollmentRequests.Where(r => r.CourseId == courseId);
            if (decision.HasValue) query = query.Where(r => r.Decision == decision.Value);
            var list = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<EnrollmentRequest>(list, page, pageSize, query.Count()));
        }

        public Task<ChapterAccess?> GetChapterAccessAsync(Guid chapterId, CancellationToken ct = default) =>
            Task.FromResult(ChapterAccesses.FirstOrDefault(a => a.ChapterId == chapterId));

        public Task AddChapterAccessAsync(ChapterAccess chapterAccess, CancellationToken ct = default)
        {
            ChapterAccesses.Add(chapterAccess);
            return Task.CompletedTask;
        }

        public Task RemoveChapterAccessAsync(ChapterAccess chapterAccess, CancellationToken ct = default)
        {
            ChapterAccesses.Remove(chapterAccess);
            return Task.CompletedTask;
        }

        public Task<ChapterUnlock?> GetChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(ChapterUnlocks.FirstOrDefault(u => u.ChapterId == chapterId && u.UserId == userId));

        public Task AddChapterUnlockAsync(ChapterUnlock chapterUnlock, CancellationToken ct = default)
        {
            ChapterUnlocks.Add(chapterUnlock);
            return Task.CompletedTask;
        }

        public Task RemoveChapterUnlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
        {
            ChapterUnlocks.RemoveAll(u => u.ChapterId == chapterId);
            return Task.CompletedTask;
        }

        public Task<bool> HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Nominations.Any(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null));

        public Task<CourseStatsDto> GetCourseStatsAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(new CourseStatsDto(0, 0, 0, 0, 0, 0));

        public Task<int> GetLearnerCountAsync(Guid courseId, CancellationToken ct = default) => Task.FromResult(0);
        public Task<int> GetNominationCountAsync(Guid courseId, CancellationToken ct = default) => Task.FromResult(0);

        public Task<Page<CourseEntity>> ListUserCoursesAsync(Guid userId, BrainMemo.Course.Contracts.Enums.UserCourseRelation relation, BrainMemo.Course.Contracts.Enums.CourseAudience audience, Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(new Page<CourseEntity>(Courses, null, false));

        public Task<PagedResult<CourseEntity>> ListProfileCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));

        public Task<PagedResult<CourseEntity>> ListMyOwnedCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));

        public Task<PagedResult<CourseEntity>> ListMyEnrolledCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));

        public Task<Page<Guid>> ListActiveLearnerIdsAsync(Guid courseId, Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<Guid>.Empty());

        public Task<Page<CourseSnapshotDto>> ListCourseSnapshotsAsync(Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<CourseSnapshotDto>.Empty());

        public Task<Page<EnrollmentFactDto>> ListEnrollmentFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<EnrollmentFactDto>.Empty());

        public Task<Page<NominationFactDto>> ListNominationFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<NominationFactDto>.Empty());

        public Task DeletePermanentlyAsync(CourseEntity course, CancellationToken ct = default) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion

    #region 1. Enrollment State Machine (Table 3.5.8.2) Tests

    [Fact]
    public async Task SelfEnroll_PublicCourse_FirstTime_ActivatesAndPublishesEvent()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Public);
        await repo.AddAsync(course);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("ACTIVE", result.Value.Status);
        Assert.Single(repo.Enrollments);
        Assert.Equal(EnrollmentStatus.Active, repo.Enrollments[0].Status);
        Assert.NotNull(repo.Enrollments[0].FirstEnrolledAt);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("SELF_ENROLL", evt.Action);
        Assert.Equal("ACTIVE", evt.ToStatus);
        Assert.Null(evt.FromStatus);
        Assert.True(evt.IsFirstActivation);
    }

    [Fact]
    public async Task SelfEnroll_PublicCourse_AlreadyActive_ReturnsIdempotentSuccess()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Public);
        await repo.AddAsync(course);

        Enrollment existing = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now.AddDays(-1), Now.AddDays(-1));
        await repo.AddEnrollmentAsync(existing);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("ACTIVE", result.Value.Status);
        Assert.Empty(outbox.EnqueuedMessages); // Idempotent: no event
    }

    [Fact]
    public async Task SelfEnroll_PublicCourse_PreviouslyLeft_ReEnrollsWithFalseFirstActivation()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Public);
        await repo.AddAsync(course);

        Enrollment existing = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Left, Now.AddDays(-5), Now.AddDays(-2));
        await repo.AddEnrollmentAsync(existing);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("ACTIVE", result.Value.Status);
        Assert.Equal(EnrollmentStatus.Active, existing.Status);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("SELF_REENROLL", evt.Action);
        Assert.Equal("LEFT", evt.FromStatus);
        Assert.Equal("ACTIVE", evt.ToStatus);
        Assert.False(evt.IsFirstActivation);
    }

    [Fact]
    public async Task SelfEnroll_RemovedLearner_FailsWithLearnerRemoved()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Public);
        await repo.AddAsync(course);

        Enrollment existing = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Removed, Now.AddDays(-5), Now.AddDays(-1));
        await repo.AddEnrollmentAsync(existing);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("LEARNER_REMOVED", result.Error.Code);
        Assert.Empty(outbox.EnqueuedMessages);
    }

    [Fact]
    public async Task SelfEnroll_PrivateCourse_CreatesPendingRequest()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Private);
        await repo.AddAsync(course);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("PENDING_APPROVAL", result.Value.Status);
        Assert.NotNull(result.Value.RequestId);
        Assert.Single(repo.EnrollmentRequests);
        Assert.Equal(EnrollmentDecision.Pending, repo.EnrollmentRequests[0].Decision);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("REQUEST_SENT", evt.Action);
        Assert.Equal("PENDING_APPROVAL", evt.ToStatus);
    }

    [Fact]
    public async Task SelfEnroll_OwnerEnrollingOwnCourse_Fails()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Public);
        await repo.AddAsync(course);

        EnrollCourseCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new EnrollCourseCommand(course.Id, OwnerId), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("CANNOT_ENROLL_OWN_COURSE", result.Error.Code);
    }

    [Fact]
    public async Task LeaveCourse_ActiveLearner_TransitionsToLeftAndPublishesEvent()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        LeaveCourseCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new LeaveCourseCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(EnrollmentStatus.Left, enrollment.Status);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("LEFT", evt.Action);
        Assert.Equal("ACTIVE", evt.FromStatus);
        Assert.Equal("LEFT", evt.ToStatus);
    }

    [Fact]
    public async Task LeaveCourse_OwnerLeavingOwnCourse_Fails()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        LeaveCourseCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new LeaveCourseCommand(course.Id, OwnerId), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("OWNER_CANNOT_LEAVE", result.Error.Code);
    }

    [Fact]
    public async Task RemoveLearner_ByOwner_TransitionsToRemovedAndPublishesEvent()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        RemoveLearnerCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new RemoveLearnerCommand(course.Id, OwnerId, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(EnrollmentStatus.Removed, enrollment.Status);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("REMOVED", evt.Action);
        Assert.Equal("ACTIVE", evt.FromStatus);
        Assert.Equal("REMOVED", evt.ToStatus);
    }

    [Fact]
    public async Task RemoveLearner_ByNonOwner_ReturnsForbidden()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        RemoveLearnerCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new RemoveLearnerCommand(course.Id, OtherUserId, LearnerId), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task InviteLearner_ByOwner_SendsInvitation()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        FakeIdentityContract identity = new();
        identity.AddEmail("learner@brainmemo.vn", LearnerId);

        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        InviteLearnerCommandHandler handler = new(repo, identity, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(
            new InviteLearnerCommand(course.Id, OwnerId, "learner@brainmemo.vn"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("INVITED", result.Value.Status);
        Assert.Single(repo.Enrollments);
        Assert.Equal(EnrollmentStatus.Invited, repo.Enrollments[0].Status);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("INVITE_SENT", evt.Action);
        Assert.Equal("INVITED", evt.ToStatus);
    }

    [Fact]
    public async Task AcceptInvitation_InvitedLearner_BecomesActive()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Invited, null, Now);
        await repo.AddEnrollmentAsync(enrollment);

        AcceptInvitationCommandHandler handler = new(repo, outbox, clock, new FakeProfileContract());
        Result<EnrollmentDto> result = await handler.Handle(new AcceptInvitationCommand(course.Id, LearnerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("ACTIVE", result.Value.Status);
        Assert.Equal(EnrollmentStatus.Active, enrollment.Status);
        Assert.NotNull(enrollment.FirstEnrolledAt);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("INVITE_ACCEPTED", evt.Action);
        Assert.Equal("INVITED", evt.FromStatus);
        Assert.Equal("ACTIVE", evt.ToStatus);
        Assert.True(evt.IsFirstActivation);
    }

    [Fact]
    public async Task DecideEnrollmentRequest_Approved_ActivatesEnrollment()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Private);
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.PendingApproval, null, Now);
        await repo.AddEnrollmentAsync(enrollment);

        EnrollmentRequest request = new(Guid.NewGuid(), course.Id, LearnerId, Now);
        await repo.AddEnrollmentRequestAsync(request);

        DecideEnrollmentRequestCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new DecideEnrollmentRequestCommand(course.Id, request.Id, OwnerId, "ACCEPTED"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(EnrollmentDecision.Accepted, request.Decision);
        Assert.Equal(EnrollmentStatus.Active, enrollment.Status);

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("REQUEST_APPROVED", evt.Action);
        Assert.Equal("ACTIVE", evt.ToStatus);
    }

    [Fact]
    public async Task DecideEnrollmentRequest_Rejected_RemovesFirstTimeEnrollment()
    {
        FakeCourseRepository repo = new();
        FakeOutboxWriter outbox = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse(CourseAccessMode.Private);
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.PendingApproval, null, Now);
        await repo.AddEnrollmentAsync(enrollment);

        EnrollmentRequest request = new(Guid.NewGuid(), course.Id, LearnerId, Now);
        await repo.AddEnrollmentRequestAsync(request);

        DecideEnrollmentRequestCommandHandler handler = new(repo, outbox, clock);
        Result result = await handler.Handle(new DecideEnrollmentRequestCommand(course.Id, request.Id, OwnerId, "REJECTED"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(EnrollmentDecision.Rejected, request.Decision);
        Assert.Empty(repo.Enrollments); // Removed because first-time

        Assert.Single(outbox.EnqueuedMessages);
        EnrollmentChanged evt = Assert.IsType<EnrollmentChanged>(outbox.EnqueuedMessages[0]);
        Assert.Equal("REQUEST_REJECTED", evt.Action);
        Assert.Equal("REMOVED", evt.ToStatus);
    }

    #endregion

    #region 2. Chapter Access & Passcode Engine (Matrix 3.2.2 & 3.5.8.1) Tests

    [Fact]
    public async Task SetChapterAccess_PublicMode_ClearsPasscodeAndIncrementsVersion()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        FakeContentContract content = new();
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        content.AddChapter(chapterId, course.Id);
        BCryptPasscodeHasher hasher = new();
        SetChapterAccessCommandHandler handler = new(repo, content, hasher, clock);

        Result result = await handler.Handle(
            new SetChapterAccessCommand(course.Id, chapterId, OwnerId, "PUBLIC", null),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        ChapterAccess? access = await repo.GetChapterAccessAsync(chapterId);
        Assert.NotNull(access);
        Assert.Equal(ChapterAccessMode.Public, access.AccessMode);
        Assert.Null(access.PasscodeHash);
        Assert.Equal(1u, access.PasscodeVersion);
    }

    [Fact]
    public async Task SetChapterAccess_ProtectedMode_ShortPasscode_Fails()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        FakeContentContract content = new();
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        content.AddChapter(chapterId, course.Id);
        BCryptPasscodeHasher hasher = new();
        SetChapterAccessCommandHandler handler = new(repo, content, hasher, clock);

        Result result = await handler.Handle(
            new SetChapterAccessCommand(course.Id, chapterId, OwnerId, "PROTECTED", "123"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_PASSCODE", result.Error.Code);
    }

    [Fact]
    public async Task SetChapterAccess_ProtectedMode_ValidPasscode_HashesAndIncrementsVersion()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        FakeContentContract content = new();
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        content.AddChapter(chapterId, course.Id);
        BCryptPasscodeHasher hasher = new();
        SetChapterAccessCommandHandler handler = new(repo, content, hasher, clock);

        Result result = await handler.Handle(
            new SetChapterAccessCommand(course.Id, chapterId, OwnerId, "PROTECTED", "SecurePass123"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        ChapterAccess? access = await repo.GetChapterAccessAsync(chapterId);
        Assert.NotNull(access);
        Assert.Equal(ChapterAccessMode.Protected, access.AccessMode);
        Assert.NotNull(access.PasscodeHash);
        Assert.True(hasher.Verify("SecurePass123", access.PasscodeHash));
        Assert.Equal(1u, access.PasscodeVersion);
    }

    [Fact]
    public async Task UnlockChapter_Owner_AlwaysSucceedsWithoutPasscode()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        BCryptPasscodeHasher hasher = new();
        MemoryPasscodeRateLimiter rateLimiter = new(clock);

        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, hasher.Hash("secret"), 1, Now);
        await repo.AddChapterAccessAsync(access);

        UnlockChapterCommandHandler handler = new(repo, hasher, rateLimiter, clock);
        Result result = await handler.Handle(
            new UnlockChapterCommand(course.Id, chapterId, OwnerId, string.Empty),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task UnlockChapter_GuestNotEnrolled_FailsWithEnrollmentRequired()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        BCryptPasscodeHasher hasher = new();
        MemoryPasscodeRateLimiter rateLimiter = new(clock);

        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, hasher.Hash("secret"), 1, Now);
        await repo.AddChapterAccessAsync(access);

        UnlockChapterCommandHandler handler = new(repo, hasher, rateLimiter, clock);
        Result result = await handler.Handle(
            new UnlockChapterCommand(course.Id, chapterId, LearnerId, "secret"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("ENROLLMENT_REQUIRED", result.Error.Code);
    }

    [Fact]
    public async Task UnlockChapter_ActiveLearner_WrongPasscode_Fails()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        Guid chapterId = Guid.NewGuid();
        BCryptPasscodeHasher hasher = new();
        MemoryPasscodeRateLimiter rateLimiter = new(clock);

        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, hasher.Hash("secret"), 1, Now);
        await repo.AddChapterAccessAsync(access);

        UnlockChapterCommandHandler handler = new(repo, hasher, rateLimiter, clock);
        Result result = await handler.Handle(
            new UnlockChapterCommand(course.Id, chapterId, LearnerId, "wrong-passcode"),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_PASSCODE", result.Error.Code);
    }

    [Fact]
    public async Task UnlockChapter_ActiveLearner_CorrectPasscode_SucceedsAndRecordsUnlock()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        Guid chapterId = Guid.NewGuid();
        BCryptPasscodeHasher hasher = new();
        MemoryPasscodeRateLimiter rateLimiter = new(clock);

        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, hasher.Hash("secret123"), 1, Now);
        await repo.AddChapterAccessAsync(access);

        UnlockChapterCommandHandler handler = new(repo, hasher, rateLimiter, clock);
        Result result = await handler.Handle(
            new UnlockChapterCommand(course.Id, chapterId, LearnerId, "secret123"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        ChapterUnlock? unlock = await repo.GetChapterUnlockAsync(chapterId, LearnerId);
        Assert.NotNull(unlock);
        Assert.Equal(1u, unlock.PasscodeVersion);
    }

    [Fact]
    public async Task UnlockChapter_BruteForce_BlocksAfter5ConsecutiveFailures()
    {
        FakeCourseRepository repo = new();
        FakeClock clock = new(Now);
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Enrollment enrollment = new(Guid.NewGuid(), course.Id, LearnerId, EnrollmentStatus.Active, Now, Now);
        await repo.AddEnrollmentAsync(enrollment);

        Guid chapterId = Guid.NewGuid();
        BCryptPasscodeHasher hasher = new();
        MemoryPasscodeRateLimiter rateLimiter = new(clock);

        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, hasher.Hash("correct-pass"), 1, Now);
        await repo.AddChapterAccessAsync(access);

        UnlockChapterCommandHandler handler = new(repo, hasher, rateLimiter, clock);

        // 5 consecutive wrong attempts
        for (int i = 0; i < 5; i++)
        {
            Result failResult = await handler.Handle(
                new UnlockChapterCommand(course.Id, chapterId, LearnerId, "bad-attempt"),
                CancellationToken.None);
            Assert.True(failResult.IsFailure);
            Assert.Equal("INVALID_PASSCODE", failResult.Error.Code);
        }

        // 6th attempt even with correct password is rate-limited
        Result rateLimitedResult = await handler.Handle(
            new UnlockChapterCommand(course.Id, chapterId, LearnerId, "correct-pass"),
            CancellationToken.None);

        Assert.True(rateLimitedResult.IsFailure);
        Assert.Equal("TOO_MANY_REQUESTS", rateLimitedResult.Error.Code);
    }

    [Fact]
    public async Task ChapterDeleted_EventReceived_CleansUpAccessAndUnlocks()
    {
        FakeCourseRepository repo = new();
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, "hash", 1, Now);
        await repo.AddChapterAccessAsync(access);

        ChapterUnlock unlock1 = new(chapterId, LearnerId, 1, Now);
        ChapterUnlock unlock2 = new(chapterId, OtherUserId, 1, Now);
        await repo.AddChapterUnlockAsync(unlock1);
        await repo.AddChapterUnlockAsync(unlock2);

        ChapterDeletedEventHandler handler = new(repo);
        ChapterDeleted evt = new(Guid.NewGuid(), Now, chapterId, course.Id, true);

        await handler.HandleAsync(evt, CancellationToken.None);

        Assert.Null(await repo.GetChapterAccessAsync(chapterId));
        Assert.Null(await repo.GetChapterUnlockAsync(chapterId, LearnerId));
        Assert.Null(await repo.GetChapterUnlockAsync(chapterId, OtherUserId));
    }

    [Fact]
    public async Task GetChapterAccessConfig_ReturnsCorrectConfig()
    {
        FakeCourseRepository repo = new();
        CourseEntity course = CreateTestCourse();
        await repo.AddAsync(course);

        Guid chapterId = Guid.NewGuid();
        ChapterAccess access = new(chapterId, course.Id, ChapterAccessMode.Protected, "hash", 2, Now);
        await repo.AddChapterAccessAsync(access);

        GetChapterAccessConfigQueryHandler handler = new(repo);

        Result<ChapterAccessConfigDto> configResult = await handler.Handle(
            new GetChapterAccessConfigQuery(course.Id, chapterId),
            CancellationToken.None);

        Assert.True(configResult.IsSuccess);
        Assert.Equal("PROTECTED", configResult.Value.AccessMode);
        Assert.Equal(2u, configResult.Value.PasscodeVersion);
    }

    #endregion
}
