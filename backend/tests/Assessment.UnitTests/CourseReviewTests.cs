using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Reviews.Commands.ReplyCourseReview;
using BrainMemo.Assessment.Application.Reviews.Commands.UpsertCourseReview;
using BrainMemo.Assessment.Application.Reviews.Queries.GetCourseReviewSummary;
using BrainMemo.Assessment.Application.Reviews.Queries.ListCourseReviews;
using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Assessment.UnitTests;

public class CourseReviewTests
{
    private class FakeRepo : IAssessmentRepository
    {
        public List<CourseReview> Reviews { get; } = new();

        public Task<CourseReview?> GetReviewByCourseAndUserAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Reviews.FirstOrDefault(r => r.CourseId == courseId && r.UserId == userId));

        public Task<CourseReview?> GetReviewByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Reviews.FirstOrDefault(r => r.Id == id));

        public Task<IReadOnlyList<CourseReview>> GetReviewsByCourseIdAsync(Guid courseId, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<CourseReview>>(Reviews.Where(r => r.CourseId == courseId).Skip((page - 1) * pageSize).Take(pageSize).ToList());

        public Task<int> CountReviewsByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Reviews.Count(r => r.CourseId == courseId));

        public Task<(decimal? AvgRating, int TotalCount, Dictionary<int, int> Distribution)> GetCourseReviewStatsAsync(Guid courseId, CancellationToken ct = default)
        {
            var ratings = Reviews.Where(r => r.CourseId == courseId).Select(r => r.Rating).ToList();
            var dist = new Dictionary<int, int> { [1] = 0, [2] = 0, [3] = 0, [4] = 0, [5] = 0 };
            if (ratings.Count == 0) return Task.FromResult((default(decimal?), 0, dist));
            foreach (var r in ratings) if (dist.ContainsKey(r)) dist[r]++;
            return Task.FromResult((Math.Round((decimal)ratings.Average(), 2) as decimal?, ratings.Count, dist));
        }

        public Task AddReviewAsync(CourseReview review, CancellationToken ct = default)
        {
            Reviews.Add(review);
            return Task.CompletedTask;
        }

        public Task DeleteReviewAsync(CourseReview review, CancellationToken ct = default)
        {
            Reviews.Remove(review);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;

        #region Unused IAssessmentRepository members
        public Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<GradeRecord?> GetGradeRecordBySourceSubmissionIdAsync(Guid sourceSubmissionId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<GradeRecord?> GetGradeRecordByIdAsync(Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AssessmentComponent?> GetComponentByIdAsync(Guid componentId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<AssessmentComponent>> GetComponentsByCourseIdAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task DeleteComponentAsync(AssessmentComponent component, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> HasGradeRecordsForComponentAsync(Guid componentId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<AssessmentConfig> GetOrCreateConfigAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task AddConfigAsync(AssessmentConfig config, CancellationToken ct = default) => throw new NotImplementedException();
        public Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForComponentAsync(Guid courseId, Guid componentId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind = null, int page = 1, int pageSize = 20, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind = null, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<Clo>> GetClosByCourseIdAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Clo?> GetCloByIdAsync(Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Clo?> GetCloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default) => throw new NotImplementedException();
        public Task AddCloAsync(Clo clo, CancellationToken ct = default) => throw new NotImplementedException();
        public Task DeleteCloAsync(Clo clo, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<bool> HasOutcomeWeightsForCloAsync(Guid cloId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<Plo>> GetPlosByCourseIdAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Plo?> GetPloByIdAsync(Guid id, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Plo?> GetPloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default) => throw new NotImplementedException();
        public Task AddPloAsync(Plo plo, CancellationToken ct = default) => throw new NotImplementedException();
        public Task DeletePloAsync(Plo plo, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByCourseIdAsync(Guid courseId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByComponentIdAsync(Guid componentId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task ReplaceComponentOutcomeWeightsAsync(Guid componentId, IEnumerable<ComponentOutcomeWeight> weights, CancellationToken ct = default) => throw new NotImplementedException();
        #endregion
    }

    private class FakeCourseContract : ICourseContract
    {
        public Dictionary<Guid, CourseAccessDto> AccessMap { get; } = new();

        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
        {
            if (viewerUserId.HasValue && AccessMap.TryGetValue(viewerUserId.Value, out var access))
            {
                return Result.Success(access);
            }

            return Result.Success(new CourseAccessDto(
                Exists: true,
                EffectiveState: "ACTIVE",
                AccessMode: "PUBLIC",
                OwnerUserId: Guid.NewGuid(),
                IsOwner: false,
                EnrollmentStatus: "ACTIVE",
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: true,
                ReasonCode: "OK"));
        }

        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId) => throw new NotImplementedException();
        public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId) => throw new NotImplementedException();
        public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId) => throw new NotImplementedException();
        public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor) => throw new NotImplementedException();
        public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId) => throw new NotImplementedException();
        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => throw new NotImplementedException();
        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => throw new NotImplementedException();
    }

    private class FakeIdentityContract : IIdentityContract
    {
        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            var list = userIds.Select(id => new UserSummaryDto(id, "Active", DateTimeOffset.UtcNow, $"user_{id.ToString()[..4]}@test.com")).ToList();
            return Task.FromResult(Result.Success<IReadOnlyList<UserSummaryDto>>(list));
        }

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private class FakeEventBus : IEventBus
    {
        public List<object> Events { get; } = new();

        public Task Publish(BrainMemo.SharedKernel.Events.IntegrationEvent @event, CancellationToken ct = default)
        {
            Events.Add(@event);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task UpsertReview_RatingOutOfRange_ReturnsValidationError()
    {
        var repo = new FakeRepo();
        var courseContract = new FakeCourseContract();
        var identity = new FakeIdentityContract();
        var handler = new UpsertCourseReviewCommandHandler(repo, courseContract, identity);

        var r0 = await handler.Handle(new UpsertCourseReviewCommand(Guid.NewGuid(), Guid.NewGuid(), 0, "Bad"), CancellationToken.None);
        Assert.False(r0.IsSuccess);

        var r6 = await handler.Handle(new UpsertCourseReviewCommand(Guid.NewGuid(), Guid.NewGuid(), 6, "Bad"), CancellationToken.None);
        Assert.False(r6.IsSuccess);
    }

    [Fact]
    public async Task UpsertReview_NonActiveLearner_ReturnsValidationError()
    {
        var repo = new FakeRepo();
        var courseContract = new FakeCourseContract();
        var identity = new FakeIdentityContract();
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        // Configure user as not enrolled
        courseContract.AccessMap[userId] = new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: Guid.NewGuid(),
            IsOwner: false,
            EnrollmentStatus: null,
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: false,
            ReasonCode: "NOT_ENROLLED");

        var handler = new UpsertCourseReviewCommandHandler(repo, courseContract, identity);
        var result = await handler.Handle(new UpsertCourseReviewCommand(courseId, userId, 5, "Good"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("học viên đang học", result.Error.Message);
    }

    [Fact]
    public async Task UpsertReview_OwnerCannotReviewOwnCourse()
    {
        var repo = new FakeRepo();
        var courseContract = new FakeCourseContract();
        var identity = new FakeIdentityContract();
        var ownerId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        courseContract.AccessMap[ownerId] = new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: ownerId,
            IsOwner: true,
            EnrollmentStatus: null,
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "OWNER");

        var handler = new UpsertCourseReviewCommandHandler(repo, courseContract, identity);
        var result = await handler.Handle(new UpsertCourseReviewCommand(courseId, ownerId, 5, "My course"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("Chủ khóa học", result.Error.Message);
    }

    [Fact]
    public async Task UpsertReview_FirstTime_CreatesReview_And_SecondTime_UpdatesExisting()
    {
        var repo = new FakeRepo();
        var courseContract = new FakeCourseContract();
        var identity = new FakeIdentityContract();
        var bus = new FakeEventBus();
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        var handler = new UpsertCourseReviewCommandHandler(repo, courseContract, identity, eventBus: bus);

        // 1. First review: 5 stars
        var firstRes = await handler.Handle(new UpsertCourseReviewCommand(courseId, userId, 5, "Tuyệt vời!"), CancellationToken.None);
        Assert.True(firstRes.IsSuccess);
        Assert.Equal(5, firstRes.Value.Rating);
        Assert.Equal("Tuyệt vời!", firstRes.Value.CommentText);
        Assert.Single(repo.Reviews);

        var createdEvent = Assert.Single(bus.Events.OfType<CourseReviewCreated>());
        Assert.Equal(5, createdEvent.Rating);
        Assert.Equal(5.0m, createdEvent.AvgRating);
        Assert.Equal(1, createdEvent.ReviewCount);

        // 2. Second review from same user: update to 4 stars
        var secondRes = await handler.Handle(new UpsertCourseReviewCommand(courseId, userId, 4, "Sửa lại 4 sao"), CancellationToken.None);
        Assert.True(secondRes.IsSuccess);
        Assert.Equal(4, secondRes.Value.Rating);
        Assert.Equal("Sửa lại 4 sao", secondRes.Value.CommentText);

        // Still exactly 1 row (unique 1 per user per course enforced)
        Assert.Single(repo.Reviews);
        Assert.Equal(firstRes.Value.Id, secondRes.Value.Id);

        var updatedEvent = Assert.Single(bus.Events.OfType<CourseReviewUpdated>());
        Assert.Equal(5, updatedEvent.OldRating);
        Assert.Equal(4, updatedEvent.NewRating);
        Assert.Equal(4.0m, updatedEvent.AvgRating);
        Assert.Equal(1, updatedEvent.ReviewCount);
    }

    [Fact]
    public async Task ReplyReview_OnlyInstructorCanReply()
    {
        var repo = new FakeRepo();
        var courseContract = new FakeCourseContract();
        var identity = new FakeIdentityContract();
        var bus = new FakeEventBus();

        var courseId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var review = new CourseReview(Guid.NewGuid(), courseId, studentId, 5, "Khóa học rất hay");
        repo.Reviews.Add(review);

        // Configure roles
        courseContract.AccessMap[otherUserId] = new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: ownerId,
            IsOwner: false,
            EnrollmentStatus: "ACTIVE",
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "OK");

        courseContract.AccessMap[ownerId] = new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: ownerId,
            IsOwner: true,
            EnrollmentStatus: null,
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "OWNER");

        var handler = new ReplyCourseReviewCommandHandler(repo, courseContract, identity, eventBus: bus);

        // Non-owner fails
        var failRes = await handler.Handle(new ReplyCourseReviewCommand(courseId, review.Id, otherUserId, "Cảm ơn em"), CancellationToken.None);
        Assert.False(failRes.IsSuccess);

        // Owner succeeds
        var okRes = await handler.Handle(new ReplyCourseReviewCommand(courseId, review.Id, ownerId, "Cảm ơn em đã ủng hộ khóa học!"), CancellationToken.None);
        Assert.True(okRes.IsSuccess);
        Assert.Equal("Cảm ơn em đã ủng hộ khóa học!", okRes.Value.ReplyText);
        Assert.NotNull(okRes.Value.RepliedAt);

        var repliedEvent = Assert.Single(bus.Events.OfType<CourseReviewReplied>());
        Assert.Equal(review.Id, repliedEvent.ReviewId);
        Assert.Equal(ownerId, repliedEvent.InstructorUserId);
    }

    [Fact]
    public async Task ListAndSummary_CalculatesAverageAndDistributionAccurately()
    {
        var repo = new FakeRepo();
        var identity = new FakeIdentityContract();
        var courseId = Guid.NewGuid();

        // 3 reviews: 5, 4, 5 stars -> average = 14 / 3 = 4.67
        repo.Reviews.Add(new CourseReview(Guid.NewGuid(), courseId, Guid.NewGuid(), 5, "Rất tốt"));
        repo.Reviews.Add(new CourseReview(Guid.NewGuid(), courseId, Guid.NewGuid(), 4, "Tốt"));
        repo.Reviews.Add(new CourseReview(Guid.NewGuid(), courseId, Guid.NewGuid(), 5, "Tuyệt vời"));

        var listHandler = new ListCourseReviewsQueryHandler(repo, identity);
        var listRes = await listHandler.Handle(new ListCourseReviewsQuery(courseId), CancellationToken.None);

        Assert.True(listRes.IsSuccess);
        Assert.Equal(3, listRes.Value.Count);
        Assert.Equal(4.67m, listRes.Value.Avg);
        Assert.Equal(3, listRes.Value.Items.Count);

        var summaryHandler = new GetCourseReviewSummaryQueryHandler(repo);
        var summaryRes = await summaryHandler.Handle(new GetCourseReviewSummaryQuery(courseId), CancellationToken.None);

        Assert.True(summaryRes.IsSuccess);
        Assert.Equal(4.67m, summaryRes.Value.AvgRating);
        Assert.Equal(3, summaryRes.Value.ReviewCount);
        Assert.Equal(2, summaryRes.Value.RatingDistribution[5]);
        Assert.Equal(1, summaryRes.Value.RatingDistribution[4]);
        Assert.Equal(0, summaryRes.Value.RatingDistribution[1]);
    }
}
