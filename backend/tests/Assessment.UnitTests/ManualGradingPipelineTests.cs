using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Commands.GradeAttemptManually;
using BrainMemo.Assessment.Application.Commands.GradeSubmission;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.GetAttemptForReview;
using BrainMemo.Assessment.Application.Queries.GetSubmissionForGrading;
using BrainMemo.Assessment.Application.Queries.ListGradingQueue;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Assessment.UnitTests;

public class ManualGradingPipelineTests
{
    private sealed class FakeLearningContract : ILearningContract
    {
        public AttemptForGradingDto? AttemptForGrading { get; set; }
        public AssignmentSubmissionDto? AssignmentSubmission { get; set; }
        public bool ApplyGradesCalled { get; private set; }
        public bool MarkGradedCalled { get; private set; }

        public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId) =>
            AttemptForGrading != null ? Result.Success(AttemptForGrading) : Result.Failure<AttemptForGradingDto>(Error.NotFound("Not found"));

        public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback)
        {
            ApplyGradesCalled = true;
            return Result.Success();
        }

        public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId) =>
            AssignmentSubmission != null ? Result.Success(AssignmentSubmission) : Result.Failure<AssignmentSubmissionDto>(Error.NotFound("Not found"));

        public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt)
        {
            MarkGradedCalled = true;
            return Result.Success();
        }

        public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<bool> IsBlockCompleted(Guid userId, Guid blockId) => throw new NotImplementedException();
        public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId) => throw new NotImplementedException();
        public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId) => throw new NotImplementedException();
        public Result SoftDeleteComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
        public Result RestoreComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
        public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId) => throw new NotImplementedException();
    }

    private sealed class FakeAssessmentContract : IAssessmentContract
    {
        public decimal TotalScoreToReturn { get; set; } = 8.5m;
        public decimal MaxScoreToReturn { get; set; } = 10m;

        public Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId) =>
            Result.Success(new GradeQuizAttemptResult(
                TotalScoreToReturn,
                MaxScoreToReturn,
                false,
                50m,
                true,
                Array.Empty<QuestionGrade>()));

        public Result RecordAssignmentSubmission(Guid submissionId, Guid courseId, Guid assignmentBlockId, Guid userId, DateTimeOffset submittedAt) => throw new NotImplementedException();
        public Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds) => throw new NotImplementedException();
        public Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId) => throw new NotImplementedException();
    }

    private sealed class FakeContentContract : IContentContract
    {
        public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey) =>
            Result.Success<IReadOnlyList<QuestionDetailDto>>(Array.Empty<QuestionDetailDto>());

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
        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) => throw new NotImplementedException();
        public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId) => throw new NotImplementedException();
        public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer) => throw new NotImplementedException();
        public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items) => throw new NotImplementedException();
        public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards) => throw new NotImplementedException();
        public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId) => throw new NotImplementedException();
    }

    private sealed class InMemoryAssessmentRepo : IAssessmentRepository
    {
        public readonly List<GradeRecord> Records = [];
        public readonly List<AssessmentComponent> Components = [];

        public Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.SourceAttemptId == sourceAttemptId));

        public Task<GradeRecord?> GetGradeRecordBySourceSubmissionIdAsync(Guid sourceSubmissionId, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.SourceSubmissionId == sourceSubmissionId));

        public Task<GradeRecord?> GetGradeRecordByIdAsync(Guid recordId, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.Id == recordId));

        public Task<AssessmentComponent?> GetComponentByIdAsync(Guid componentId, CancellationToken ct = default) =>
            Task.FromResult(Components.FirstOrDefault(c => c.Id == componentId));

        public Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default) =>
            Task.FromResult(Components.FirstOrDefault(c => c.CourseId == courseId && c.SourceBlockId == sourceBlockId));

        public Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1, CancellationToken ct = default)
        {
            var existing = Components.FirstOrDefault(c => c.CourseId == courseId && c.SourceBlockId == sourceBlockId);
            if (existing != null) return Task.FromResult(existing);
            var comp = new AssessmentComponent(Guid.NewGuid(), courseId, sourceKind, sourceBlockId, title, maxScore, courseWeight);
            Components.Add(comp);
            return Task.FromResult(comp);
        }

        public Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default) => Task.FromResult<AssessmentConfig?>(null);

        public Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default)
        {
            if (!Records.Contains(record)) Records.Add(record);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind, int page, int pageSize, CancellationToken ct = default)
        {
            var query = Records.Where(r => r.CourseId == courseId && !r.IsFullyGraded);
            if (kind == "QUIZ_ATTEMPT") query = query.Where(r => r.RecordType == GradeRecordType.QuizAttempt);
            else if (kind == "ASSIGNMENT") query = query.Where(r => r.RecordType == GradeRecordType.AssignmentSubmission);
            return Task.FromResult<IReadOnlyList<GradeRecord>>(query.Skip((page - 1) * pageSize).Take(pageSize).ToList());
        }

        public Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind, CancellationToken ct = default)
        {
            var query = Records.Where(r => r.CourseId == courseId && !r.IsFullyGraded);
            if (kind == "QUIZ_ATTEMPT") query = query.Where(r => r.RecordType == GradeRecordType.QuizAttempt);
            else if (kind == "ASSIGNMENT") query = query.Where(r => r.RecordType == GradeRecordType.AssignmentSubmission);
            return Task.FromResult(query.Count());
        }

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => r.CourseId == courseId && r.UserId == userId).ToList());

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => r.CourseId == courseId).ToList());

        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    [Fact]
    public async Task GradeSubmission_HappyPath_UpdatesScore_And_MarksLearningGraded()
    {
        var repo = new InMemoryAssessmentRepo();
        var learning = new FakeLearningContract();
        var handler = new GradeSubmissionCommandHandler(repo, learning);

        var submissionId = Guid.NewGuid();
        var record = new GradeRecord(
            id: Guid.NewGuid(),
            userId: Guid.NewGuid(),
            courseId: Guid.NewGuid(),
            componentId: Guid.NewGuid(),
            recordType: GradeRecordType.AssignmentSubmission,
            sourceAttemptId: null,
            sourceSubmissionId: submissionId,
            score: null,
            maxScore: 10m,
            isFullyGraded: false,
            gradedAt: null,
            feedback: null);
        repo.Records.Add(record);

        var cmd = new GradeSubmissionCommand(submissionId, 9.0m, "Làm bài rất tốt!");
        var res = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(res.IsSuccess);
        Assert.Equal(9.0m, record.Score);
        Assert.True(record.IsFullyGraded);
        Assert.Equal("Làm bài rất tốt!", record.Feedback);
        Assert.True(learning.MarkGradedCalled);
    }

    [Fact]
    public async Task GradeSubmission_ScoreExceedingMax_FailsValidation()
    {
        var repo = new InMemoryAssessmentRepo();
        var learning = new FakeLearningContract();
        var handler = new GradeSubmissionCommandHandler(repo, learning);

        var submissionId = Guid.NewGuid();
        var record = new GradeRecord(
            id: Guid.NewGuid(),
            userId: Guid.NewGuid(),
            courseId: Guid.NewGuid(),
            componentId: Guid.NewGuid(),
            recordType: GradeRecordType.AssignmentSubmission,
            sourceAttemptId: null,
            sourceSubmissionId: submissionId,
            score: null,
            maxScore: 10m,
            isFullyGraded: false,
            gradedAt: null,
            feedback: null);
        repo.Records.Add(record);

        var cmd = new GradeSubmissionCommand(submissionId, 11.5m, "Vượt quá điểm tối đa");
        var res = await handler.Handle(cmd, CancellationToken.None);

        Assert.False(res.IsSuccess);
        Assert.False(record.IsFullyGraded);
    }

    [Fact]
    public async Task GradeAttemptManually_DEC03_DelegatesToLearning_And_FinalizesGrade()
    {
        var repo = new InMemoryAssessmentRepo();
        var learning = new FakeLearningContract();
        var assessmentContract = new FakeAssessmentContract();
        var handler = new GradeAttemptManuallyCommandHandler(learning, assessmentContract, repo);

        var attemptId = Guid.NewGuid();
        var q1 = Guid.NewGuid();
        var q2 = Guid.NewGuid();

        learning.AttemptForGrading = new AttemptForGradingDto(
            AttemptId: attemptId,
            CourseId: Guid.NewGuid(),
            QuizBlockId: Guid.NewGuid(),
            UserId: Guid.NewGuid(),
            PassScorePercent: 50m,
            Questions: new[]
            {
                new GradingQuestionItemDto(q1, 1, "ESSAY", false, 5m, Array.Empty<GradingOptionItemDto>(), "Mẫu", new GradingAnswerPayloadDto(null, "Bài làm câu 1", null)),
                new GradingQuestionItemDto(q2, 2, "ESSAY", false, 5m, Array.Empty<GradingOptionItemDto>(), "Mẫu", new GradingAnswerPayloadDto(null, "Bài làm câu 2", null))
            });

        var record = new GradeRecord(
            id: Guid.NewGuid(),
            userId: learning.AttemptForGrading.UserId,
            courseId: learning.AttemptForGrading.CourseId,
            componentId: Guid.NewGuid(),
            recordType: GradeRecordType.QuizAttempt,
            sourceAttemptId: attemptId,
            sourceSubmissionId: null,
            score: null,
            maxScore: 10m,
            isFullyGraded: false,
            gradedAt: null,
            feedback: null);
        repo.Records.Add(record);

        var cmd = new GradeAttemptManuallyCommand(
            attemptId,
            GraderUserId: Guid.NewGuid(),
            Grades: new[]
            {
                new ManualQuestionGradeInput(q1, 4.5m, "Ý hay"),
                new ManualQuestionGradeInput(q2, 4.0m, "Cần chi tiết hơn")
            },
            OverallFeedback: "Tổng quan bài làm tốt.");

        var res = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(res.IsSuccess);
        Assert.True(learning.ApplyGradesCalled);
        Assert.Equal(8.5m, res.Value.TotalScore);
        Assert.True(res.Value.IsFullyGraded);
        Assert.Equal(8.5m, record.Score);
        Assert.True(record.IsFullyGraded);
    }
}
