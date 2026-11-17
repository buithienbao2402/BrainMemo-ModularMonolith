using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.Commands.ApplySanction;
using BrainMemo.Moderation.Application.Commands.CreateReport;
using BrainMemo.Moderation.Application.Commands.LiftSanction;
using BrainMemo.Moderation.Application.Commands.ResolveReport;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Application.Queries.GetDashboard;
using BrainMemo.Moderation.Application.Queries.GetReportById;
using BrainMemo.Moderation.Application.Queries.GetTargetContent;
using BrainMemo.Moderation.Application.Queries.ListAuditLogs;
using BrainMemo.Moderation.Application.Queries.ListCourseReports;
using BrainMemo.Moderation.Application.Queries.ListReports;
using BrainMemo.Moderation.Application.Queries.ListSanctions;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Contracts.Events;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Moderation.Infrastructure.BackgroundJobs;
using BrainMemo.Moderation.Infrastructure.Contracts;
using BrainMemo.Moderation.Infrastructure.EventHandlers;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.Moderation.Infrastructure.Transactions;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using CourseReportTarget = BrainMemo.Course.Contracts.Dtos.ReportTargetDto;
using LearningReportTarget = BrainMemo.Learning.Contracts.Dtos.ReportTargetDto;

namespace Moderation.UnitTests;

public sealed class ModerationPipelineUnitTests
{
    private static readonly DateTimeOffset BaseTime = new(2026, 11, 16, 12, 0, 0, TimeSpan.Zero);

    private sealed class TestClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = now;
    }

    private sealed class FakeEventBus : IEventBus
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
        {
            PublishedEvents.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeTransactionAccessor : IAmbientTransactionAccessor
    {
        public IModerationTxContext? Current => null;
    }

    private sealed class FakeCourseContract : ICourseContract
    {
        public Dictionary<Guid, CourseReportTarget> Targets { get; } = [];
        public List<Guid> HiddenCourses { get; } = [];
        public List<Guid> RestoredCourses { get; } = [];
        public List<Guid> DeletedCourses { get; } = [];

        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
        {
            if (Targets.TryGetValue(courseId, out var target))
            {
                if (target.AccessMode == "ONLY_ME")
                {
                    return new CourseAccessDto(true, "ACTIVE", "ONLY_ME", target.OwnerUserId, false, null, false, false, false, "ONLY_ME");
                }

                return new CourseAccessDto(true, "ACTIVE", target.AccessMode, target.OwnerUserId, viewerUserId == target.OwnerUserId, null, true, true, true, "OK");
            }

            return Error.NotFound("Course not found");
        }

        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId)
            => new ChapterAccessResult(true, true, "OK");

        public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId)
        {
            List<CourseSummaryDto> summaries = [];
            foreach (var id in courseIds)
            {
                if (Targets.TryGetValue(id, out var t))
                {
                    summaries.Add(new CourseSummaryDto(t.CourseId, t.CourseName, "Description", null, t.OwnerUserId, t.AccessMode, "ACTIVE", true, []));
                }
            }
            return Result.Success<IReadOnlyList<CourseSummaryDto>>(summaries);
        }

        public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit)
            => new Page<CourseSummaryDto>([], null, false);

        public Result<CourseReportTarget> ResolveReportTarget(Guid courseId, Guid reporterUserId)
        {
            if (Targets.TryGetValue(courseId, out var target))
            {
                return target;
            }
            return Error.NotFound("Khóa học không tồn tại.");
        }

        public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId)
        {
            HiddenCourses.Add(courseId);
            return Result.Success();
        }

        public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor)
        {
            RestoredCourses.Add(courseId);
            return Result.Success();
        }

        public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId)
        {
            DeletedCourses.Add(courseId);
            return Result.Success("Sample Course Name");
        }

        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) => new Page<Guid>([], null, false);
        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => new Page<CourseSnapshotDto>([], null, false);
        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => new Page<EnrollmentFactDto>([], null, false);
        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => new Page<NominationFactDto>([], null, false);
    }

    private sealed class FakeLearningContract : ILearningContract
    {
        public Dictionary<Guid, LearningReportTarget> CommentTargets { get; } = [];
        public List<Guid> SoftDeletedComments { get; } = [];
        public List<Guid> RestoredComments { get; } = [];

        public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<bool> IsBlockCompleted(Guid userId, Guid blockId) => true;
        public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId) => throw new NotImplementedException();
        public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId) => throw new NotImplementedException();
        public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback) => Result.Success();
        public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit) => new Page<Guid>([], null, false);
        public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId) => throw new NotImplementedException();
        public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt) => Result.Success();

        public Result<LearningReportTarget> ResolveReportTarget(Guid commentId, Guid reporterUserId)
        {
            if (CommentTargets.TryGetValue(commentId, out var target))
            {
                return target;
            }
            return Error.NotFound("Bình luận không tồn tại.");
        }

        public Result SoftDeleteComment(Guid commentId, Guid actorAdminId)
        {
            SoftDeletedComments.Add(commentId);
            return Result.Success();
        }

        public Result RestoreComment(Guid commentId, Guid actorAdminId)
        {
            RestoredComments.Add(commentId);
            return Result.Success();
        }

        public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId) => new CourseLearningStatsDto(10, 5);
    }

    private sealed class FakeIdentityContract : IIdentityContract
    {
        public HashSet<Guid> AdminIds { get; } = [];
        public List<(Guid UserId, LockType Type, DateTimeOffset? Until, string Reason)> LockedAccounts { get; } = [];
        public List<(Guid UserId, string Reason)> UnlockedAccounts { get; } = [];

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default)
            => Task.FromResult(Result.Success(new AccountStatusDto("ACTIVE", null, null, true)));

        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default)
            => Task.FromResult(Result.Success(AdminIds.Contains(userId)));

        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default)
            => Task.FromResult(Result.Success(AdminIds.Count <= 1 && AdminIds.Contains(userId)));

        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
            => Task.FromResult(Result.Success<IReadOnlyList<UserSummaryDto>>([]));

        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default)
            => Task.FromResult(Result.Success(new Page<Guid>([], null, false)));

        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default)
            => Task.FromResult(Result.Success<Guid?>(Guid.NewGuid()));

        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default)
        {
            if (userId == actorAdminId) return Task.FromResult(Result.Failure(Error.Conflict(ErrorCodes.SelfLock, "Self lock not allowed")));
            LockedAccounts.Add((userId, type, until, reason));
            return Task.FromResult(Result.Success());
        }

        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default)
        {
            UnlockedAccounts.Add((userId, reason));
            return Task.FromResult(Result.Success());
        }
    }

    private sealed class FakeProfileContract : IProfileContract
    {
        public Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(Result.Success(new PublicProfileDto(userId, "Display Name", "avatar.jpg", "Bio", BaseTime, true)));
        }

        public Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            var list = userIds.Select(id => new DisplayInfoDto(id, $"User {id}", null)).ToList();
            return Task.FromResult(Result.Success<IReadOnlyList<DisplayInfoDto>>(list));
        }
    }

    private static ModerationDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<ModerationDbContext> options = new DbContextOptionsBuilder<ModerationDbContext>()
            .UseInMemoryDatabase($"mod_test_{Guid.NewGuid():N}")
            .Options;

        return new ModerationDbContext(options);
    }

    [Fact]
    public async Task SubmitAiFlag_IsIdempotentOnAiFindingId()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);
        ModerationContractService contractService = new(db, repo, clock);

        Guid findingId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();

        // 1. First submit
        Result<Guid> res1 = await contractService.SubmitAiFlag(
            findingId,
            ReportTargetType.Course,
            courseId,
            courseId,
            ownerId,
            "HATE_SPEECH",
            "Offensive snapshot text",
            0.95m);

        Assert.True(res1.IsSuccess);
        Guid reportId1 = res1.Value;

        // 2. Second submit with same findingId
        Result<Guid> res2 = await contractService.SubmitAiFlag(
            findingId,
            ReportTargetType.Course,
            courseId,
            courseId,
            ownerId,
            "HATE_SPEECH",
            "Offensive snapshot text",
            0.95m);

        Assert.True(res2.IsSuccess);
        Assert.Equal(reportId1, res2.Value);

        // Verify only 1 record created
        int reportCount = await db.Reports.CountAsync();
        Assert.Equal(1, reportCount);
        Report report = await db.Reports.FirstAsync();
        Assert.Equal(ReportSource.Ai, report.Source);
        Assert.Equal(ReportStatus.Pending, report.Status);
        Assert.Equal(0.95m, report.AiScore);
    }

    [Fact]
    public async Task CreateReport_CreatesUserReport_AndPreventsDuplicatePending()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();

        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        Guid reporterId = Guid.NewGuid();

        courseContract.Targets[courseId] = new CourseReportTarget(courseId, "Sample Course", ownerId, "PUBLIC", true);

        CreateReportCommandHandler handler = new(repo, courseContract, learningContract, clock);

        CreateReportRequest request = new(
            "COURSE",
            courseId,
            "SPAM",
            "Contains advertising links",
            [new CreateReportEvidenceRequest("LINK", null, "https://spam.example.com")]);

        // 1. First report -> Success
        Result<Guid> res1 = await handler.Handle(new CreateReportCommand(reporterId, request), CancellationToken.None);
        Assert.True(res1.IsSuccess);

        Report? createdReport = await repo.FindReportByIdAsync(res1.Value);
        Assert.NotNull(createdReport);
        Assert.Equal(ReportSource.User, createdReport.Source);
        Assert.Equal(ReportStatus.Pending, createdReport.Status);
        Assert.Single(createdReport.Evidences);

        // 2. Duplicate report by same user -> 409 DUPLICATE_REPORT
        Result<Guid> res2 = await handler.Handle(new CreateReportCommand(reporterId, request), CancellationToken.None);
        Assert.True(res2.IsFailure);
        Assert.Equal(ErrorCodes.DuplicateReport, res2.Error.Code);
    }

    [Fact]
    public async Task ResolveReport_AppliesSanctions_WritesAuditLog_AndEmitsEvent()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);
        FakeTransactionAccessor accessor = new();
        ModerationTransaction tx = new(db, accessor);
        FakeIdentityContract identityContract = new();
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();
        FakeProfileContract profileContract = new();
        FakeEventBus eventBus = new();

        Guid adminId = Guid.NewGuid();
        identityContract.AdminIds.Add(adminId);

        Guid reporterId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();

        // Seed a pending report
        Report report = Report.CreateUserReport(
            Guid.NewGuid(),
            reporterId,
            ReportTargetType.Course,
            courseId,
            courseId,
            ownerId,
            "INAPPROPRIATE",
            "Course violates terms",
            "Course Title Snapshot",
            BaseTime).Value;

        await repo.AddReportAsync(report);
        await repo.SaveChangesAsync();

        ResolveReportCommandHandler handler = new(
            repo,
            tx,
            identityContract,
            courseContract,
            learningContract,
            profileContract,
            eventBus,
            clock);

        ResolveReportRequest resolveRequest = new(
            "ACCEPTED",
            "Violation confirmed by admin team",
            [
                new SanctionRequest("COURSE_HIDE", courseId, "Tạm ẩn khóa học do vi phạm", BaseTime.AddDays(7), null),
                new SanctionRequest("ACCOUNT_LOCK_TEMPORARY", ownerId, "Khóa tài khoản 3 ngày", BaseTime.AddDays(3), null)
            ],
            null);

        Result<ReportDto> resolveResult = await handler.Handle(
            new ResolveReportCommand(report.Id, adminId, resolveRequest),
            CancellationToken.None);

        Assert.True(resolveResult.IsSuccess);
        Assert.Equal("ACCEPTED", resolveResult.Value.Status);

        // Check Course was hidden
        Assert.Contains(courseId, courseContract.HiddenCourses);

        // Check Identity account was locked
        Assert.Contains(identityContract.LockedAccounts, l => l.UserId == ownerId && l.Type == LockType.Temporary);

        // Check Sanction records in DB
        var sanctions = await repo.ListSanctionsAsync(true, null, 1, 10);
        Assert.Equal(2, sanctions.Items.Count);

        // Check Audit Logs in DB
        var auditLogs = await repo.ListAuditLogsAsync(null, null, null, null, null, 1, 10);
        Assert.True(auditLogs.Items.Count >= 3); // 2 sanctions + 1 report resolution

        // Check post-commit event emitted
        Assert.Single(eventBus.PublishedEvents);
        ReportResolved resolvedEvent = Assert.IsType<ReportResolved>(eventBus.PublishedEvents[0]);
        Assert.Equal(report.Id, resolvedEvent.ReportId);
        Assert.Equal("ACCEPTED", resolvedEvent.Decision);
        Assert.Equal(2, resolvedEvent.Sanctions.Count);
    }

    [Fact]
    public async Task ApplyDirectSanction_AndLiftSanction_FullLifecycle()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);
        FakeIdentityContract identityContract = new();
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();
        FakeEventBus eventBus = new();

        Guid adminId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();

        courseContract.Targets[courseId] = new CourseReportTarget(courseId, "Bad Course", ownerId, "PUBLIC", true);

        ApplySanctionCommandHandler applyHandler = new(repo, identityContract, courseContract, learningContract, eventBus, clock);
        LiftSanctionCommandHandler liftHandler = new(repo, identityContract, courseContract, learningContract, clock);

        // 1. Direct Course Hide
        SanctionRequest req = new("COURSE_HIDE", courseId, "Tạm ẩn do khiếu nại bản quyền", BaseTime.AddDays(14), null);
        Result<Guid> applyResult = await applyHandler.Handle(new ApplySanctionCommand(adminId, req), CancellationToken.None);
        Assert.True(applyResult.IsSuccess);

        Guid sanctionId = applyResult.Value;
        Assert.Contains(courseId, courseContract.HiddenCourses);
        Assert.Single(eventBus.PublishedEvents);
        SanctionApplied appliedEvt = Assert.IsType<SanctionApplied>(eventBus.PublishedEvents[0]);
        Assert.Equal(sanctionId, appliedEvt.SanctionId);

        // 2. Lift Sanction
        LiftSanctionRequest liftReq = new("Tác giả đã bổ sung giấy tờ bản quyền");
        Result liftResult = await liftHandler.Handle(new LiftSanctionCommand(sanctionId, adminId, liftReq), CancellationToken.None);
        Assert.True(liftResult.IsSuccess);

        Assert.Contains(courseId, courseContract.RestoredCourses);
        Sanction? liftedSanction = await repo.FindSanctionByIdAsync(sanctionId);
        Assert.NotNull(liftedSanction);
        Assert.False(liftedSanction.IsActive);
        Assert.Equal(LiftKind.Manual, liftedSanction.LiftKind);
    }

    [Fact]
    public async Task RestoreExpiredHiddenCoursesWorker_AutoRestoresExpiredCourses()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);
        FakeCourseContract courseContract = new();

        Guid course1 = Guid.NewGuid();
        Guid course2 = Guid.NewGuid();
        Guid adminId = Guid.NewGuid();

        // Expired sanction (expired 1 hour ago)
        Sanction sExpired = Sanction.Create(
            Guid.NewGuid(),
            null,
            SanctionType.CourseHide,
            SanctionTargetType.Course,
            course1,
            Guid.NewGuid(),
            "Temp hide 1",
            adminId,
            BaseTime.AddHours(-1),
            BaseTime.AddHours(-24)).Value;

        // Not expired sanction (expires in 2 days)
        Sanction sNotExpired = Sanction.Create(
            Guid.NewGuid(),
            null,
            SanctionType.CourseHide,
            SanctionTargetType.Course,
            course2,
            Guid.NewGuid(),
            "Temp hide 2",
            adminId,
            BaseTime.AddDays(2),
            BaseTime).Value;

        await repo.AddSanctionAsync(sExpired);
        await repo.AddSanctionAsync(sNotExpired);
        await repo.SaveChangesAsync();

        ServiceCollection services = new();
        services.AddSingleton(db);
        services.AddSingleton<IModerationRepository>(repo);
        services.AddSingleton<ICourseContract>(courseContract);
        using ServiceProvider sp = services.BuildServiceProvider();

        RestoreExpiredHiddenCoursesWorker worker = new(sp, clock, NullLogger<RestoreExpiredHiddenCoursesWorker>.Instance);

        int restored = await worker.ProcessExpiredHiddenCoursesAsync(CancellationToken.None);

        Assert.Equal(1, restored);
        Assert.Contains(course1, courseContract.RestoredCourses);
        Assert.DoesNotContain(course2, courseContract.RestoredCourses);

        Sanction? reloaded1 = await repo.FindSanctionByIdAsync(sExpired.Id);
        Assert.NotNull(reloaded1);
        Assert.False(reloaded1.IsActive);
        Assert.Equal(LiftKind.Expired, reloaded1.LiftKind);
    }

    [Fact]
    public async Task AccountUnlockedEventHandler_ClosesTemporaryLockSanction()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        ModerationRepository repo = new(db);

        Guid sanctionId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        Guid adminId = Guid.NewGuid();

        Sanction lockSanction = Sanction.Create(
            sanctionId,
            null,
            SanctionType.AccountLockTemporary,
            SanctionTargetType.User,
            userId,
            userId,
            "Temp account lock",
            adminId,
            BaseTime.AddDays(1),
            BaseTime).Value;

        await repo.AddSanctionAsync(lockSanction);
        await repo.SaveChangesAsync();

        AccountUnlockedEventHandler handler = new(db, repo, NullLogger<AccountUnlockedEventHandler>.Instance);

        AccountUnlocked evt = new(
            Guid.NewGuid(),
            BaseTime.AddDays(1),
            userId,
            sanctionId,
            UnlockKind.AutoExpired);

        await handler.HandleAsync(evt, CancellationToken.None);

        Sanction? reloaded = await repo.FindSanctionByIdAsync(sanctionId);
        Assert.NotNull(reloaded);
        Assert.False(reloaded.IsActive);
        Assert.Equal(LiftKind.Expired, reloaded.LiftKind);
    }

    [Fact]
    public async Task GetReportTargetContent_ReturnsNotFound_WhenCourseIsOnlyMe()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        ModerationRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeLearningContract learningContract = new();

        Guid onlyMeCourseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        courseContract.Targets[onlyMeCourseId] = new CourseReportTarget(onlyMeCourseId, "Private Secrets", ownerId, "ONLY_ME", false);

        Report report = Report.CreateUserReport(
            Guid.NewGuid(),
            Guid.NewGuid(),
            ReportTargetType.Course,
            onlyMeCourseId,
            onlyMeCourseId,
            ownerId,
            "SUSPICIOUS",
            "Report only me",
            "Private Secrets",
            BaseTime).Value;

        await repo.AddReportAsync(report);
        await repo.SaveChangesAsync();

        GetReportTargetContentQueryHandler handler = new(repo, courseContract, learningContract);

        Result<object> result = await handler.Handle(new GetReportTargetContentQuery(report.Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, result.Error.Code);
    }

    [Fact]
    public async Task ListCourseReportsQuery_ForbidsNonOwnerNonAdmin()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        ModerationRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeIdentityContract identityContract = new();
        FakeProfileContract profileContract = new();

        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        Guid randomLearnerId = Guid.NewGuid();

        courseContract.Targets[courseId] = new CourseReportTarget(courseId, "Course Title", ownerId, "PUBLIC", true);

        ListCourseReportsQueryHandler handler = new(repo, courseContract, identityContract, profileContract);

        Result<PagedListResponse<ReportDto>> result = await handler.Handle(
            new ListCourseReportsQuery(courseId, randomLearnerId),
            CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task GetDashboard_ReturnsCorrectCounts()
    {
        await using ModerationDbContext db = CreateInMemoryDbContext();
        TestClock clock = new(BaseTime);
        ModerationRepository repo = new(db);

        Report userReport = Report.CreateUserReport(
            Guid.NewGuid(),
            Guid.NewGuid(),
            ReportTargetType.Course,
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "SPAM",
            "User reported spam",
            "Snapshot",
            BaseTime).Value;

        Report aiReport = Report.CreateAiReport(
            Guid.NewGuid(),
            Guid.NewGuid(),
            ReportTargetType.Comment,
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "TOXICITY",
            "Snapshot",
            0.88m,
            BaseTime).Value;

        await repo.AddReportAsync(userReport);
        await repo.AddReportAsync(aiReport);
        await repo.SaveChangesAsync();

        GetModerationDashboardQueryHandler handler = new(repo, clock);

        Result<ModerationDashboardDto> result = await handler.Handle(new GetModerationDashboardQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value.PendingReports);
        Assert.Equal(0, result.Value.PendingCourseReviews);
    }
}
