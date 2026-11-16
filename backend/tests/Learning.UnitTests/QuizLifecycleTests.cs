using BrainMemo.Assessment.Contracts;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Learning.Application.Commands.SaveQuizAnswer;
using BrainMemo.Learning.Application.Commands.StartQuizAttempt;
using BrainMemo.Learning.Application.Commands.SubmitQuizAttempt;
using BrainMemo.Learning.Application.Queries.GetQuizAttempt;
using BrainMemo.Learning.Application.Queries.ListQuizAttempts;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Learning.UnitTests;

public class QuizLifecycleTests
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
        public QuizDefinitionDto? QuizDef { get; set; }
        public bool PasswordValid { get; set; } = true;
        public QuizExceptionDto? QuizException { get; set; }
        public DrawnQuizDto? DrawnQuiz { get; set; }
        public IReadOnlyList<QuestionDetailDto> Questions { get; set; } = Array.Empty<QuestionDetailDto>();

        public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId) =>
            QuizDef != null ? Result.Success(QuizDef) : Result.Failure<QuizDefinitionDto>(Error.NotFound("Not found"));

        public Result VerifyQuizPassword(Guid quizBlockId, string password) =>
            PasswordValid ? Result.Success() : Result.Failure(Error.Validation("Password invalid"));

        public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId) =>
            Result.Success(QuizException);

        public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId) =>
            DrawnQuiz != null ? Result.Success(DrawnQuiz) : Result.Failure<DrawnQuizDto>(Error.NotFound("Not found"));

        public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) =>
            Result.Success(Questions);

        public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds) => throw new NotImplementedException();
        public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<int> CountPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId) => throw new NotImplementedException();
        public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId) => throw new NotImplementedException();
        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) => throw new NotImplementedException();
        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) => throw new NotImplementedException();
        public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => throw new NotImplementedException();
        public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer) => throw new NotImplementedException();
        public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items) => throw new NotImplementedException();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards) => throw new NotImplementedException();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => throw new NotImplementedException();
    }

    private sealed class FakeAssessmentContract : IAssessmentContract
    {
        public GradeQuizAttemptResult? GradeResult { get; set; }
        public bool ThrowOnGrade { get; set; }

        public Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId)
        {
            if (ThrowOnGrade) throw new InvalidOperationException("Assessment service down");
            return GradeResult != null ? Result.Success(GradeResult) : Result.Failure<GradeQuizAttemptResult>(Error.NotFound("Not found"));
        }

        public Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds) => throw new NotImplementedException();
        public Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId) => throw new NotImplementedException();
    }

    [Fact]
    public async Task StartQuizAttempt_HappyPath_CreatesAttemptWithoutLeakingAnswers()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();
        var opt1 = Guid.NewGuid();
        var opt2 = Guid.NewGuid();

        var contentContract = new FakeContentContract
        {
            QuizDef = new QuizDefinitionDto(blockId, 50.0m, false, "AFTER_SUBMIT", 30, 3, false, false),
            DrawnQuiz = new DrawnQuizDto(blockId, new[] { qId }),
            Questions = new[]
            {
                new QuestionDetailDto(
                    qId,
                    "MULTIPLE_CHOICE",
                    "What is 2+2?",
                    "Because 2+2=4",
                    "4",
                    1,
                    10m,
                    new[]
                    {
                        new QuestionOptionDto(opt1, 1, "4", null, null, true),
                        new QuestionOptionDto(opt2, 2, "5", null, null, false)
                    })
            }
        };

        var handler = new StartQuizAttemptCommandHandler(
            repo,
            contentContract,
            NullLogger<StartQuizAttemptCommandHandler>.Instance);

        var result = await handler.Handle(new StartQuizAttemptCommand(userId, courseId, blockId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var attempt = result.Value;
        Assert.Equal("IN_PROGRESS", attempt.Status);
        Assert.Single(attempt.Questions);

        var q = attempt.Questions[0];
        Assert.Null(q.Explanation); // Masked!
        Assert.Null(q.ReferenceAnswer); // Masked!
        Assert.All(q.Options, opt => Assert.Null(opt.IsCorrect)); // Masked!
    }

    [Fact]
    public async Task StartQuizAttempt_ActiveAttemptExists_ReturnsExistingAttempt_F5Recovery()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();

        var contentContract = new FakeContentContract
        {
            QuizDef = new QuizDefinitionDto(blockId, 50.0m, false, "AFTER_SUBMIT", 30, 3, false, false),
            DrawnQuiz = new DrawnQuizDto(blockId, new[] { qId }),
            Questions = new[]
            {
                new QuestionDetailDto(qId, "MULTIPLE_CHOICE", "Question?", null, null, 1, 10m, Array.Empty<QuestionOptionDto>())
            }
        };

        var handler = new StartQuizAttemptCommandHandler(repo, contentContract, NullLogger<StartQuizAttemptCommandHandler>.Instance);

        // Start first time
        var res1 = await handler.Handle(new StartQuizAttemptCommand(userId, courseId, blockId), CancellationToken.None);
        Assert.True(res1.IsSuccess);

        // Start second time (e.g. page refresh)
        var res2 = await handler.Handle(new StartQuizAttemptCommand(userId, courseId, blockId), CancellationToken.None);
        Assert.True(res2.IsSuccess);
        Assert.Equal(res1.Value.Id, res2.Value.Id); // Same attempt returned
    }

    [Fact]
    public async Task StartQuizAttempt_PasswordRequired_InvalidPassword_Fails()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        var contentContract = new FakeContentContract
        {
            QuizDef = new QuizDefinitionDto(blockId, 50.0m, true, "AFTER_SUBMIT", 30, 3, false, false),
            PasswordValid = false
        };

        var handler = new StartQuizAttemptCommandHandler(repo, contentContract, NullLogger<StartQuizAttemptCommandHandler>.Instance);

        var result = await handler.Handle(new StartQuizAttemptCommand(userId, courseId, blockId, "wrong_pw"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("Mật khẩu", result.Error?.Message);
    }

    [Fact]
    public async Task SaveQuizAnswer_InProgress_SavesPayloadSuccessfully()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();
        var optId = Guid.NewGuid();

        var attempt = new QuizAttempt(
            Guid.NewGuid(),
            userId,
            courseId,
            blockId,
            1,
            DateTimeOffset.UtcNow.AddMinutes(30),
            10m,
            "[]");

        var answer = new QuizAttemptAnswer(Guid.NewGuid(), attempt.Id, qId, 1, 10m);

        await repo.AddQuizAttemptWithAnswersAsync(attempt, new[] { answer });
        await repo.SaveChangesAsync();

        var contentContract = new FakeContentContract
        {
            QuizDef = new QuizDefinitionDto(blockId, 50m, false, "AFTER_SUBMIT", 30, 3, false, false)
        };

        var handler = new SaveQuizAnswerCommandHandler(repo, contentContract);
        var saveRes = await handler.Handle(
            new SaveQuizAnswerCommand(attempt.Id, qId, userId, new AnswerPayloadDto(new[] { optId }, null, null)),
            CancellationToken.None);

        Assert.True(saveRes.IsSuccess);

        var updatedAnswer = await repo.GetQuizAttemptAnswerAsync(attempt.Id, qId);
        Assert.NotNull(updatedAnswer);
        Assert.Contains(optId.ToString(), updatedAnswer.AnswerPayload);
    }

    [Fact]
    public async Task SubmitQuizAttempt_TwoPhaseCommit_GradesAndMarksBlockCompleted()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();

        var attempt = new QuizAttempt(
            Guid.NewGuid(),
            userId,
            courseId,
            blockId,
            1,
            DateTimeOffset.UtcNow.AddMinutes(30),
            10m,
            "[]");

        var answer = new QuizAttemptAnswer(Guid.NewGuid(), attempt.Id, qId, 1, 10m);

        await repo.AddQuizAttemptWithAnswersAsync(attempt, new[] { answer });
        await repo.SaveChangesAsync();

        var contentContract = new FakeContentContract
        {
            QuizDef = new QuizDefinitionDto(blockId, 50m, false, "AFTER_SUBMIT", 30, 3, false, false)
        };

        var assessmentContract = new FakeAssessmentContract
        {
            GradeResult = new GradeQuizAttemptResult(
                TotalScore: 10m,
                MaxScore: 10m,
                PendingManual: false,
                PassScorePercent: 50m,
                IsPassed: true,
                Questions: new[] { new QuestionGrade(qId, 10m, true) })
        };

        var handler = new SubmitQuizAttemptCommandHandler(
            repo,
            assessmentContract,
            contentContract,
            NullLogger<SubmitQuizAttemptCommandHandler>.Instance);

        var submitRes = await handler.Handle(new SubmitQuizAttemptCommand(attempt.Id, userId), CancellationToken.None);

        Assert.True(submitRes.IsSuccess);
        Assert.Equal("GRADED", submitRes.Value.Status);
        Assert.Equal(10m, submitRes.Value.TotalScore);
        Assert.True(submitRes.Value.IsPassed);

        // Verify block completion was recorded
        var blockCompletion = await repo.GetBlockCompletionAsync(userId, blockId);
        Assert.NotNull(blockCompletion);
    }

    [Fact]
    public async Task SubmitQuizAttempt_AssessmentThrows_RemainsSubmitted()
    {
        using var db = CreateInMemoryDbContext();
        var repo = new LearningRepository(db);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();

        var attempt = new QuizAttempt(
            Guid.NewGuid(),
            userId,
            courseId,
            blockId,
            1,
            DateTimeOffset.UtcNow.AddMinutes(30),
            10m,
            "[]");

        var answer = new QuizAttemptAnswer(Guid.NewGuid(), attempt.Id, qId, 1, 10m);
        await repo.AddQuizAttemptWithAnswersAsync(attempt, new[] { answer });
        await repo.SaveChangesAsync();

        var contentContract = new FakeContentContract();
        var assessmentContract = new FakeAssessmentContract { ThrowOnGrade = true };

        var handler = new SubmitQuizAttemptCommandHandler(
            repo,
            assessmentContract,
            contentContract,
            NullLogger<SubmitQuizAttemptCommandHandler>.Instance);

        var res = await handler.Handle(new SubmitQuizAttemptCommand(attempt.Id, userId), CancellationToken.None);

        Assert.True(res.IsSuccess);
        // TX1 succeeded, status is SUBMITTED
        var updatedAttempt = await repo.GetQuizAttemptByIdAsync(attempt.Id);
        Assert.Equal("SUBMITTED", updatedAttempt!.Status);
        Assert.Null(updatedAttempt.TotalScore);
    }
}
