using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Learning.Application.Commands.CreateComment;
using BrainMemo.Learning.Application.Commands.DeleteComment;
using BrainMemo.Learning.Application.Commands.EditComment;
using BrainMemo.Learning.Application.Commands.PinComment;
using BrainMemo.Learning.Application.Commands.UnpinComment;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Application.Queries.GetCommentsSummary;
using BrainMemo.Learning.Application.Queries.ListComments;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Infrastructure.Persistence;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Learning.UnitTests;

public sealed class CommentsTests
{
    private sealed class TestClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = now;
    }

    private sealed class TestEventBus : IEventBus
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
        {
            PublishedEvents.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeCourseContract : ICourseContract
    {
        public Func<Guid, Guid?, CourseAccessDto>? GetCourseAccessFunc { get; set; }

        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
        {
            if (GetCourseAccessFunc is not null)
            {
                return Result.Success(GetCourseAccessFunc(courseId, viewerUserId));
            }

            return Result.Success(new CourseAccessDto(
                Exists: true,
                EffectiveState: "ACTIVE",
                AccessMode: "PUBLIC",
                OwnerUserId: Guid.NewGuid(),
                IsOwner: true,
                EnrollmentStatus: "ACTIVE",
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: true,
                ReasonCode: "OK"));
        }

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
        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) => Result.Success(new Page<Guid>([], null, false));
        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => Result.Success(new Page<CourseSnapshotDto>([], null, false));
        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => Result.Success(new Page<EnrollmentFactDto>([], null, false));
        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => Result.Success(new Page<NominationFactDto>([], null, false));
    }

    private sealed class FakeProfileContract : IProfileContract
    {
        public Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(new PublicProfileDto(userId, "User " + userId, null, null, DateTimeOffset.UtcNow, true)));

        public Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            var list = userIds.Select(id => new DisplayInfoDto(id, "DisplayName_" + id.ToString()[..4], null)).ToList();
            return Task.FromResult(Result.Success<IReadOnlyList<DisplayInfoDto>>(list));
        }
    }

    private static LearningDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<LearningDbContext> options = new DbContextOptionsBuilder<LearningDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new LearningDbContext(options);
    }

    [Fact]
    public async Task CreateComment_RootComment_SucceedsAndEmitsEvent()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeProfileContract profileContract = new();
        TestEventBus bus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        CreateCommentCommandHandler handler = new(courseContract, repo, profileContract, bus, clock);

        Guid courseId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        CreateCommentCommand cmd = new(courseId, null, null, "Bình luận hay quá!", userId);
        Result<CommentDto> result = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Bình luận hay quá!", result.Value.Content);
        Assert.Equal(userId, result.Value.Author.Id);
        Assert.Single(bus.PublishedEvents);
        Assert.IsType<CommentCreated>(bus.PublishedEvents[0]);
    }

    [Fact]
    public async Task CreateComment_ReplyToParentDifferentCourse_FailsValidation()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeProfileContract profileContract = new();
        TestEventBus bus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseA = Guid.NewGuid();
        Guid courseB = Guid.NewGuid();
        Guid parentId = Guid.NewGuid();

        Comment parent = Comment.Create(parentId, courseA, null, Guid.NewGuid(), null, "Parent", clock.UtcNow).Value;
        await repo.AddCommentAsync(parent);
        await repo.SaveChangesAsync();

        CreateCommentCommandHandler handler = new(courseContract, repo, profileContract, bus, clock);

        // Attempting to reply to parent from courseA, but in courseB
        CreateCommentCommand cmd = new(courseB, null, parentId, "Reply in wrong course", Guid.NewGuid());
        Result<CommentDto> result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("khóa học", result.Error.Message);
    }

    [Fact]
    public async Task CreateComment_ReplyToParentDifferentChapter_FailsValidation()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeProfileContract profileContract = new();
        TestEventBus bus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid chapterA = Guid.NewGuid();
        Guid chapterB = Guid.NewGuid();
        Guid parentId = Guid.NewGuid();

        Comment parent = Comment.Create(parentId, courseId, chapterA, Guid.NewGuid(), null, "Parent", clock.UtcNow).Value;
        await repo.AddCommentAsync(parent);
        await repo.SaveChangesAsync();

        CreateCommentCommandHandler handler = new(courseContract, repo, profileContract, bus, clock);

        // Attempting to reply specifying chapterB when parent is chapterA
        CreateCommentCommand cmd = new(courseId, chapterB, parentId, "Reply in wrong chapter", Guid.NewGuid());
        Result<CommentDto> result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("chương học", result.Error.Message);
    }

    [Fact]
    public async Task CreateComment_ReplyToReply_FailsValidation_MaxOneLevelNesting()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeProfileContract profileContract = new();
        TestEventBus bus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid rootId = Guid.NewGuid();
        Guid reply1Id = Guid.NewGuid();

        Comment root = Comment.Create(rootId, courseId, null, Guid.NewGuid(), null, "Root", clock.UtcNow).Value;
        Comment reply1 = Comment.Create(reply1Id, courseId, null, Guid.NewGuid(), rootId, "Reply 1", clock.UtcNow).Value;

        await repo.AddCommentAsync(root);
        await repo.AddCommentAsync(reply1);
        await repo.SaveChangesAsync();

        CreateCommentCommandHandler handler = new(courseContract, repo, profileContract, bus, clock);

        // Replying to reply1 (attempting level 2 nesting)
        CreateCommentCommand cmd = new(courseId, null, reply1Id, "Nested reply 2", Guid.NewGuid());
        Result<CommentDto> result = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("1 cấp", result.Error.Message);
    }

    [Fact]
    public async Task PinComment_WhenActorIsCourseOwner_Succeeds()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        Guid commentId = Guid.NewGuid();

        courseContract.GetCourseAccessFunc = (cId, vId) => new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: ownerId,
            IsOwner: vId == ownerId,
            EnrollmentStatus: "ACTIVE",
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "OK");

        Comment comment = Comment.Create(commentId, courseId, null, Guid.NewGuid(), null, "Important", clock.UtcNow).Value;
        await repo.AddCommentAsync(comment);
        await repo.SaveChangesAsync();

        PinCommentCommandHandler handler = new(courseContract, repo, clock);
        Result result = await handler.Handle(new PinCommentCommand(commentId, ownerId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Comment? loaded = await repo.GetCommentByIdAsync(commentId);
        Assert.NotNull(loaded);
        Assert.True(loaded.IsPinned);
        Assert.Equal(ownerId, loaded.PinnedByUserId);
    }

    [Fact]
    public async Task PinComment_WhenActorIsNotCourseOwner_FailsForbidden()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid ownerId = Guid.NewGuid();
        Guid strangerId = Guid.NewGuid();
        Guid commentId = Guid.NewGuid();

        courseContract.GetCourseAccessFunc = (cId, vId) => new CourseAccessDto(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: ownerId,
            IsOwner: false, // Stranger
            EnrollmentStatus: "ACTIVE",
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "OK");

        Comment comment = Comment.Create(commentId, courseId, null, Guid.NewGuid(), null, "Normal comment", clock.UtcNow).Value;
        await repo.AddCommentAsync(comment);
        await repo.SaveChangesAsync();

        PinCommentCommandHandler handler = new(courseContract, repo, clock);
        Result result = await handler.Handle(new PinCommentCommand(commentId, strangerId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task EditComment_WhenAuthor_Succeeds_WhenOtherUser_FailsForbidden()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeProfileContract profileContract = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid commentId = Guid.NewGuid();
        Guid authorId = Guid.NewGuid();
        Guid otherUserId = Guid.NewGuid();

        Comment comment = Comment.Create(commentId, Guid.NewGuid(), null, authorId, null, "Initial text", clock.UtcNow).Value;
        await repo.AddCommentAsync(comment);
        await repo.SaveChangesAsync();

        EditCommentCommandHandler handler = new(repo, profileContract, clock);

        // Other user attempts to edit
        Result<CommentDto> failResult = await handler.Handle(new EditCommentCommand(commentId, "Hacked text", otherUserId), CancellationToken.None);
        Assert.False(failResult.IsSuccess);
        Assert.Equal(ErrorCodes.Forbidden, failResult.Error.Code);

        // Author edits
        Result<CommentDto> successResult = await handler.Handle(new EditCommentCommand(commentId, "Updated text", authorId), CancellationToken.None);
        Assert.True(successResult.IsSuccess);
        Assert.Equal("Updated text", successResult.Value.Content);
        Assert.NotNull(successResult.Value.EditedAt);
    }

    [Fact]
    public async Task DeleteComment_SoftDeletesAndEmitsEvent()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        TestEventBus bus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid commentId = Guid.NewGuid();
        Guid authorId = Guid.NewGuid();

        Comment comment = Comment.Create(commentId, Guid.NewGuid(), null, authorId, null, "To be deleted", clock.UtcNow).Value;
        await repo.AddCommentAsync(comment);
        await repo.SaveChangesAsync();

        DeleteCommentCommandHandler handler = new(repo, bus, clock);
        Result result = await handler.Handle(new DeleteCommentCommand(commentId, authorId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Comment? loaded = await repo.GetCommentByIdAsync(commentId);
        Assert.NotNull(loaded);
        Assert.True(loaded.IsDeleted);

        Assert.Single(bus.PublishedEvents);
        Assert.IsType<CommentDeleted>(bus.PublishedEvents[0]);
    }

    [Fact]
    public async Task ListComments_ReturnsPinnedFirstAndNestedReplies()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeProfileContract profileContract = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid root1Id = Guid.NewGuid();
        Guid root2Id = Guid.NewGuid();
        Guid reply1Id = Guid.NewGuid();

        Comment root1 = Comment.Create(root1Id, courseId, null, Guid.NewGuid(), null, "Root 1 (normal)", clock.UtcNow).Value;
        Comment root2 = Comment.Create(root2Id, courseId, null, Guid.NewGuid(), null, "Root 2 (pinned)", clock.UtcNow.AddMinutes(1)).Value;
        root2.Pin(Guid.NewGuid(), clock.UtcNow.AddMinutes(2));

        Comment reply1 = Comment.Create(reply1Id, courseId, null, Guid.NewGuid(), root1Id, "Reply to root 1", clock.UtcNow.AddMinutes(3)).Value;

        await repo.AddCommentAsync(root1);
        await repo.AddCommentAsync(root2);
        await repo.AddCommentAsync(reply1);
        await repo.SaveChangesAsync();

        ListCommentsQueryHandler handler = new(repo, profileContract);
        Result<PagedResult<CommentDto>> result = await handler.Handle(new ListCommentsQuery(courseId, null, 1, 10, null), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Items.Count); // 2 root comments
        Assert.Equal(root2Id, result.Value.Items[0].Id); // Pinned root2 is first
        Assert.True(result.Value.Items[0].IsPinned);

        Assert.Equal(root1Id, result.Value.Items[1].Id); // Normal root1 is second
        Assert.Single(result.Value.Items[1].Replies); // reply1 is nested under root1
        Assert.Equal(reply1Id, result.Value.Items[1].Replies[0].Id);
    }
}
