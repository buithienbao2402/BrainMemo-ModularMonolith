using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Commands.AnswerPracticeQuestion;
using BrainMemo.Learning.Application.Commands.CompleteBlock;
using BrainMemo.Learning.Application.Commands.RemoveBookmark;
using BrainMemo.Learning.Application.Commands.SetBookmark;
using BrainMemo.Learning.Application.Queries.GetChapterProgressSummary;
using BrainMemo.Learning.Application.Queries.GetCourseEnrollmentSummary;
using BrainMemo.Learning.Application.Queries.GetCourseProgress;
using BrainMemo.Learning.Application.Queries.ListMyBookmarks;
using BrainMemo.Learning.Application.Queries.ReadChapter;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Domain.Enums;
using BrainMemo.Learning.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Learning.UnitTests;

public sealed class LearningTests
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
        public Func<Guid, Guid, Guid?, ChapterAccessResult>? CheckChapterAccessFunc { get; set; }
        public Func<Guid, Guid?, CourseAccessDto>? GetCourseAccessFunc { get; set; }
        public Func<IReadOnlyList<Guid>, Guid?, IReadOnlyList<CourseSummaryDto>>? GetCourseSummariesFunc { get; set; }

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
                IsOwner: false,
                EnrollmentStatus: "ACTIVE",
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: true,
                ReasonCode: "OK"));
        }

        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId)
        {
            if (CheckChapterAccessFunc is not null)
            {
                return Result.Success(CheckChapterAccessFunc(courseId, chapterId, viewerUserId));
            }

            return Result.Success(new ChapterAccessResult(true, viewerUserId.HasValue, "OK"));
        }

        public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId)
        {
            if (GetCourseSummariesFunc is not null)
            {
                return Result.Success(GetCourseSummariesFunc(courseIds, viewerUserId));
            }

            return Result.Success<IReadOnlyList<CourseSummaryDto>>(courseIds.Select(id => new CourseSummaryDto(
                Id: id,
                Name: "Test Course",
                Description: "Desc",
                CoverUrl: null,
                OwnerUserId: Guid.NewGuid(),
                AccessMode: "PUBLIC",
                Status: "ACTIVE",
                Visible: true)).ToList());
        }

        public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit) =>
            Result.Success(new Page<CourseSummaryDto>([], null, false));

        public Result<BrainMemo.Course.Contracts.Dtos.ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId) =>
            Result.Failure<BrainMemo.Course.Contracts.Dtos.ReportTargetDto>(Error.NotFound("Not found"));

        public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId) => Result.Success();
        public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor) => Result.Success();
        public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId) => Result.Success("Test");

        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) =>
            Result.Success(new Page<Guid>([Guid.NewGuid(), Guid.NewGuid()], null, false));

        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) =>
            Result.Success(new Page<CourseSnapshotDto>([], null, false));

        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) =>
            Result.Success(new Page<EnrollmentFactDto>([], null, false));

        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) =>
            Result.Success(new Page<NominationFactDto>([], null, false));
    }

    private sealed class FakeContentContract : IContentContract
    {
        public Dictionary<Guid, PublishedChapterContentDto> PublishedChapters { get; } = [];
        public Dictionary<Guid, PublishedBlockRef> PublishedBlocks { get; } = [];
        public List<ChapterInfoDto> ChapterInfos { get; } = [];

        public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds) =>
            Result.Success<IReadOnlyList<ChapterInfoDto>>(ChapterInfos.Where(c => chapterIds.Contains(c.Id)).ToList());

        public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId) =>
            Result.Success<IReadOnlyList<ChapterInfoDto>>(ChapterInfos.Where(c => c.CourseId == courseId).ToList());

        public Result<int> CountPublishedChapters(Guid courseId) =>
            Result.Success(ChapterInfos.Count(c => c.CourseId == courseId));

        public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId)
        {
            if (PublishedChapters.TryGetValue(chapterId, out PublishedChapterContentDto? value))
            {
                return Result.Success(value);
            }
            return Result.Failure<PublishedChapterContentDto>(Error.NotFound("Chương không tồn tại"));
        }

        public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) =>
            Result.Success<IReadOnlyList<PublishedBlockRef>>(PublishedBlocks.Values.ToList());

        public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId)
        {
            if (PublishedBlocks.TryGetValue(blockId, out PublishedBlockRef? value))
            {
                return Result.Success(value);
            }
            return Result.Failure<PublishedBlockRef>(Error.NotFound("Block không tồn tại"));
        }

        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) => Result.Success<IReadOnlyList<AssessableBlockDto>>([]);
        public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId) => Result.Failure<QuizDefinitionDto>(Error.NotFound("Not found"));
        public Result VerifyQuizPassword(Guid quizBlockId, string password) => Result.Success();
        public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId) => Result.Success<QuizExceptionDto?>(null);
        public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId) => Result.Failure<DrawnQuizDto>(Error.NotFound("Not found"));
        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) => Result.Failure<AssignmentDefinitionDto>(Error.NotFound("Not found"));
        public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) => Result.Success<IReadOnlyList<QuestionDetailDto>>([]);
        public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => Result.Failure<PracticeQuestionDto>(Error.NotFound("Not found"));

        public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer) =>
            Result.Success(new PracticeResultDto(true, "Chính xác", 1.0m));

        public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => Result.Failure<ResourceAuthDto>(Error.NotFound("Not found"));
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items) => Result.Success();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards) => Result.Success();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => Result.Success("Test text");
    }

    private static LearningDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<LearningDbContext> options = new DbContextOptionsBuilder<LearningDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new LearningDbContext(options);
    }

    [Fact]
    public async Task ReadChapter_WhenGuestAccessPublicChapter_ReturnsBlocksWithoutSavingProgress()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();

        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        Guid blockId = Guid.NewGuid();

        courseContract.CheckChapterAccessFunc = (_, _, user) =>
            new ChapterAccessResult(Allowed: true, CanSaveProgress: false, Reason: "OK");

        contentContract.PublishedChapters[chapterId] = new PublishedChapterContentDto(
            ChapterId: chapterId,
            CourseId: courseId,
            VersionNo: 1,
            Title: "Chapter 1",
            Description: "Desc",
            Blocks: [new PublishedBlockRef(blockId, chapterId, "RICH_TEXT", 1, null, null, 1)]);

        ReadChapterQueryHandler handler = new(courseContract, contentContract, repo);
        Result<LearnChapterDto> result = await handler.Handle(new ReadChapterQuery(courseId, chapterId, null), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(result.Value.CanSaveProgress);
        Assert.Single(result.Value.Blocks);
        Assert.False(result.Value.Blocks[0].Completed);
    }

    [Fact]
    public async Task ReadChapter_WhenGuestHitsPrivateCourse_ReturnsUnauthenticated()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();

        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();

        courseContract.CheckChapterAccessFunc = (_, _, user) =>
            new ChapterAccessResult(Allowed: false, CanSaveProgress: false, Reason: "COURSE_DENIED");

        ReadChapterQueryHandler handler = new(courseContract, contentContract, repo);
        Result<LearnChapterDto> result = await handler.Handle(new ReadChapterQuery(courseId, chapterId, null), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal("UNAUTHENTICATED", result.Error.Code);
    }

    [Fact]
    public async Task ReadChapter_WhenUnenrolledLearner_ReturnsNotEnrolledError()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();

        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        courseContract.CheckChapterAccessFunc = (_, _, user) =>
            new ChapterAccessResult(Allowed: false, CanSaveProgress: false, Reason: "NOT_ENROLLED");

        ReadChapterQueryHandler handler = new(courseContract, contentContract, repo);
        Result<LearnChapterDto> result = await handler.Handle(new ReadChapterQuery(courseId, chapterId, userId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal("NOT_ENROLLED", result.Error.Code);
    }

    [Fact]
    public async Task CompleteBlock_WhenEnrolledActive_CompletesBlockAndCalculatesProgress()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();
        TestEventBus eventBus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        Guid blockId1 = Guid.NewGuid();
        Guid blockId2 = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        contentContract.ChapterInfos.Add(new ChapterInfoDto(chapterId, courseId, 1, "Ch 1", null, "PUBLISHED", 1, 1, clock.UtcNow, clock.UtcNow));
        contentContract.PublishedBlocks[blockId1] = new PublishedBlockRef(blockId1, chapterId, "RICH_TEXT", 1, null, null, 1);
        contentContract.PublishedBlocks[blockId2] = new PublishedBlockRef(blockId2, chapterId, "RICH_TEXT", 2, null, null, 1);
        contentContract.PublishedChapters[chapterId] = new PublishedChapterContentDto(
            chapterId,
            courseId,
            1,
            "Ch 1",
            null,
            [contentContract.PublishedBlocks[blockId1], contentContract.PublishedBlocks[blockId2]]);

        courseContract.CheckChapterAccessFunc = (_, _, _) =>
            new ChapterAccessResult(Allowed: true, CanSaveProgress: true, Reason: "OK");

        CompleteBlockCommandHandler handler = new(courseContract, contentContract, repo, eventBus, clock);

        // Complete block 1
        Result<CourseProgressDto> result1 = await handler.Handle(new CompleteBlockCommand(courseId, blockId1, userId), CancellationToken.None);
        Assert.True(result1.IsSuccess);
        Assert.Equal(50.0, result1.Value.Chapters[0].Percent);
        Assert.Equal(0.0, result1.Value.Percent);
        Assert.Contains(eventBus.PublishedEvents, e => e is BlockCompleted);

        // Complete block 1 again (idempotent)
        Result<CourseProgressDto> resultDuplicate = await handler.Handle(new CompleteBlockCommand(courseId, blockId1, userId), CancellationToken.None);
        Assert.True(resultDuplicate.IsSuccess);
        Assert.Equal(50.0, resultDuplicate.Value.Chapters[0].Percent);

        // Complete block 2 -> completes chapter and course!
        Result<CourseProgressDto> result2 = await handler.Handle(new CompleteBlockCommand(courseId, blockId2, userId), CancellationToken.None);
        Assert.True(result2.IsSuccess);
        Assert.Equal(100.0, result2.Value.Chapters[0].Percent);
        Assert.Equal(100.0, result2.Value.Percent);
        Assert.Contains(eventBus.PublishedEvents, e => e is ChapterCompleted);
        Assert.Contains(eventBus.PublishedEvents, e => e is CourseCompleted);
        Assert.NotNull(result2.Value.CourseCompletedAt);
    }

    [Fact]
    public async Task CompleteBlock_WhenGuest_ReturnsForbidden()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();
        TestEventBus eventBus = new();
        TestClock clock = new(DateTimeOffset.UtcNow);

        Guid courseId = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();
        Guid blockId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();

        contentContract.PublishedBlocks[blockId] = new PublishedBlockRef(blockId, chapterId, "RICH_TEXT", 1, null, null, 1);
        courseContract.CheckChapterAccessFunc = (_, _, _) =>
            new ChapterAccessResult(Allowed: true, CanSaveProgress: false, Reason: "OK");

        CompleteBlockCommandHandler handler = new(courseContract, contentContract, repo, eventBus, clock);
        Result<CourseProgressDto> result = await handler.Handle(new CompleteBlockCommand(courseId, blockId, userId), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal("FORBIDDEN", result.Error.Code);
    }

    [Fact]
    public async Task Bookmark_SetRemoveList_WorksCorrectly()
    {
        using LearningDbContext db = CreateInMemoryDbContext();
        LearningRepository repo = new(db);
        TestClock clock = new(DateTimeOffset.UtcNow);
        FakeCourseContract courseContract = new();
        FakeContentContract contentContract = new();

        Guid userId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        Guid chapterId1 = Guid.NewGuid();
        Guid chapterId2 = Guid.NewGuid();

        contentContract.ChapterInfos.Add(new ChapterInfoDto(chapterId1, courseId, 1, "Ch 1", null, "PUBLISHED", 1, 1, clock.UtcNow, clock.UtcNow));
        contentContract.ChapterInfos.Add(new ChapterInfoDto(chapterId2, courseId, 2, "Ch 2", null, "PUBLISHED", 1, 1, clock.UtcNow, clock.UtcNow));

        SetBookmarkCommandHandler setHandler = new(repo, clock);
        RemoveBookmarkCommandHandler removeHandler = new(repo);
        ListMyBookmarksQueryHandler listHandler = new(repo, courseContract, contentContract);

        // Set bookmark
        Result setResult = await setHandler.Handle(new SetBookmarkCommand(courseId, chapterId1, userId), CancellationToken.None);
        Assert.True(setResult.IsSuccess);

        Result<IReadOnlyList<BookmarkDto>> listResult = await listHandler.Handle(new ListMyBookmarksQuery(userId), CancellationToken.None);
        Assert.True(listResult.IsSuccess);
        Assert.Single(listResult.Value);
        Assert.Equal(chapterId1, listResult.Value[0].ChapterId);

        // Update bookmark to chapter 2
        await setHandler.Handle(new SetBookmarkCommand(courseId, chapterId2, userId), CancellationToken.None);
        listResult = await listHandler.Handle(new ListMyBookmarksQuery(userId), CancellationToken.None);
        Assert.Single(listResult.Value);
        Assert.Equal(chapterId2, listResult.Value[0].ChapterId);

        // Remove bookmark
        Result removeResult = await removeHandler.Handle(new RemoveBookmarkCommand(courseId, userId), CancellationToken.None);
        Assert.True(removeResult.IsSuccess);
        listResult = await listHandler.Handle(new ListMyBookmarksQuery(userId), CancellationToken.None);
        Assert.Empty(listResult.Value);
    }
}
