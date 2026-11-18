using BrainMemo.Assessment.Contracts;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Learning.Application.Commands.SaveAssignmentSubmissionDraft;
using BrainMemo.Learning.Application.Commands.SubmitAssignment;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Application.Queries.GetMyAssignmentSubmission;
using BrainMemo.Learning.Application.Queries.ListPendingSubmissions;
using BrainMemo.Learning.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Learning.UnitTests;

public class AssignmentSubmissionTests
{
    private static LearningDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<LearningDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new LearningDbContext(options);
    }

    private sealed class FakeContentContract : IContentContract
    {
        public AssignmentDefinitionDto? AssignmentDef { get; set; }

        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) =>
            AssignmentDef != null ? Result.Success(AssignmentDef) : Result.Failure<AssignmentDefinitionDto>(Error.NotFound("Not found"));

        public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds) => throw new NotImplementedException();
        public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<int> CountPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId) => throw new NotImplementedException();
        public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) => throw new NotImplementedException();
        public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId) => throw new NotImplementedException();
        public Result VerifyQuizPassword(Guid quizBlockId, string password) => throw new NotImplementedException();
        public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId) => throw new NotImplementedException();
        public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) => throw new NotImplementedException();
        public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => throw new NotImplementedException();
        public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer) => throw new NotImplementedException();
        public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items) => throw new NotImplementedException();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards) => throw new NotImplementedException();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => throw new NotImplementedException();
    }

    private sealed class FakeAssessmentContract : IAssessmentContract
    {
        public bool RecordCalled { get; private set; }
        public Guid RecordedSubmissionId { get; private set; }

        public Result RecordAssignmentSubmission(Guid submissionId, Guid courseId, Guid assignmentBlockId, Guid userId, DateTimeOffset submittedAt)
        {
            RecordCalled = true;
            RecordedSubmissionId = submissionId;
            return Result.Success();
        }

        public Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId) => throw new NotImplementedException();
        public Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds) => throw new NotImplementedException();
        public Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId) => throw new NotImplementedException();
    }

    [Fact]
    public async Task SaveDraft_And_GetMySubmission_Success()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);
        var saveHandler = new SaveAssignmentSubmissionDraftCommandHandler(repo);
        var getHandler = new GetMyAssignmentSubmissionQueryHandler(repo);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var saveCmd = new SaveAssignmentSubmissionDraftCommand(
            courseId,
            blockId,
            userId,
            new SubmissionUpsertDto("Nội dung bài làm nháp", new[] { "key1" }, null));

        var saveRes = await saveHandler.Handle(saveCmd, CancellationToken.None);
        Assert.True(saveRes.IsSuccess);
        Assert.Equal("DRAFT", saveRes.Value.Status);
        Assert.Equal("Nội dung bài làm nháp", saveRes.Value.TextContent);
        Assert.NotNull(saveRes.Value.Files);

        // Retrieve
        var getQuery = new GetMyAssignmentSubmissionQuery(courseId, blockId, userId);
        var getRes = await getHandler.Handle(getQuery, CancellationToken.None);
        Assert.True(getRes.IsSuccess);
        Assert.Equal("DRAFT", getRes.Value.Status);
        Assert.Equal("Nội dung bài làm nháp", getRes.Value.TextContent);
    }

    [Fact]
    public async Task SubmitAssignment_OnTime_MarksSubmitted_And_RecordsInAssessment()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);
        var blockId = Guid.NewGuid();
        var content = new FakeContentContract
        {
            AssignmentDef = new AssignmentDefinitionDto(
                AssignmentBlockId: blockId,
                DueAt: DateTimeOffset.UtcNow.AddDays(2),
                MaxPoints: 10m,
                MaxFileSizeBytes: 10485760)
        };
        var assessment = new FakeAssessmentContract();
        var saveHandler = new SaveAssignmentSubmissionDraftCommandHandler(repo);
        var submitHandler = new SubmitAssignmentCommandHandler(repo, content, assessment);

        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        await saveHandler.Handle(new SaveAssignmentSubmissionDraftCommand(
            courseId, blockId, userId, new SubmissionUpsertDto("Bài nộp chính thức")), CancellationToken.None);

        var submitRes = await submitHandler.Handle(new SubmitAssignmentCommand(courseId, blockId, userId), CancellationToken.None);
        Assert.True(submitRes.IsSuccess);
        Assert.Equal("SUBMITTED", submitRes.Value.Status);
        Assert.False(submitRes.Value.IsLate ?? true);
        Assert.True(assessment.RecordCalled);
        Assert.Equal(submitRes.Value.Id, assessment.RecordedSubmissionId);

        // Verify block completion recorded
        var completion = await repo.GetBlockCompletionAsync(userId, blockId);
        Assert.NotNull(completion);

        // Trying to edit submitted draft fails
        var editRes = await saveHandler.Handle(new SaveAssignmentSubmissionDraftCommand(
            courseId, blockId, userId, new SubmissionUpsertDto("Sửa sau khi nộp")), CancellationToken.None);
        Assert.False(editRes.IsSuccess);
        Assert.Equal("ALREADY_SUBMITTED", editRes.Error.Code);
    }

    [Fact]
    public async Task SubmitAssignment_PastDueDate_MarksIsLateTrue()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);
        var blockId = Guid.NewGuid();
        var content = new FakeContentContract
        {
            AssignmentDef = new AssignmentDefinitionDto(
                AssignmentBlockId: blockId,
                DueAt: DateTimeOffset.UtcNow.AddDays(-1), // Past due
                MaxPoints: 10m,
                MaxFileSizeBytes: 10485760)
        };
        var assessment = new FakeAssessmentContract();
        var submitHandler = new SubmitAssignmentCommandHandler(repo, content, assessment);

        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var submitRes = await submitHandler.Handle(new SubmitAssignmentCommand(courseId, blockId, userId), CancellationToken.None);
        Assert.True(submitRes.IsSuccess);
        Assert.Equal("SUBMITTED", submitRes.Value.Status);
        Assert.True(submitRes.Value.IsLate);
    }

    [Fact]
    public async Task ListPendingSubmissions_ReturnsOnlySubmittedOrPendingGrading()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);
        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();

        var sub1 = new BrainMemo.Learning.Domain.Entities.AssignmentSubmission(Guid.NewGuid(), Guid.NewGuid(), courseId, blockId);
        sub1.Submit(false, DateTimeOffset.UtcNow);
        await repo.AddAssignmentSubmissionAsync(sub1);

        var sub2 = new BrainMemo.Learning.Domain.Entities.AssignmentSubmission(Guid.NewGuid(), Guid.NewGuid(), courseId, blockId);
        // Draft not submitted
        await repo.AddAssignmentSubmissionAsync(sub2);
        await repo.SaveChangesAsync();

        var handler = new ListPendingSubmissionsQueryHandler(repo);
        var res = await handler.Handle(new ListPendingSubmissionsQuery(courseId), CancellationToken.None);

        Assert.True(res.IsSuccess);
        Assert.Single(res.Value);
        Assert.Equal(sub1.Id, res.Value[0].Id);
    }
}
