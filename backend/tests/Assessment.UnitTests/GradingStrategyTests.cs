using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Grading;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Infrastructure.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Assessment.UnitTests;

public class GradingStrategyTests
{
    [Fact]
    public void MultipleChoiceStrategy_SingleSelect_Correct_AwardsFullPoints()
    {
        var strategy = new MultipleChoiceGradingStrategy();
        var option1 = new GradingOptionItemDto(Guid.NewGuid(), 1, "Option A", null, null, true);
        var option2 = new GradingOptionItemDto(Guid.NewGuid(), 2, "Option B", null, null, false);

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "MULTIPLE_CHOICE",
            AllowMultiple: false,
            MaxPoints: 10m,
            new[] { option1, option2 },
            null,
            new GradingAnswerPayloadDto(new[] { option1.Id }, null, null));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.True(result.IsCorrect);
        Assert.Equal(10m, result.PointsEarned);
    }

    [Fact]
    public void MultipleChoiceStrategy_SingleSelect_Wrong_AwardsZeroPoints()
    {
        var strategy = new MultipleChoiceGradingStrategy();
        var option1 = new GradingOptionItemDto(Guid.NewGuid(), 1, "Option A", null, null, true);
        var option2 = new GradingOptionItemDto(Guid.NewGuid(), 2, "Option B", null, null, false);

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "MULTIPLE_CHOICE",
            AllowMultiple: false,
            MaxPoints: 10m,
            new[] { option1, option2 },
            null,
            new GradingAnswerPayloadDto(new[] { option2.Id }, null, null));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.False(result.IsCorrect);
        Assert.Equal(0m, result.PointsEarned);
    }

    [Fact]
    public void MultipleChoiceStrategy_MultiSelect_Partial_AwardsZeroPoints()
    {
        var strategy = new MultipleChoiceGradingStrategy();
        var option1 = new GradingOptionItemDto(Guid.NewGuid(), 1, "Option A", null, null, true);
        var option2 = new GradingOptionItemDto(Guid.NewGuid(), 2, "Option B", null, null, true);
        var option3 = new GradingOptionItemDto(Guid.NewGuid(), 3, "Option C", null, null, false);

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "MULTIPLE_CHOICE",
            AllowMultiple: true,
            MaxPoints: 10m,
            new[] { option1, option2, option3 },
            null,
            new GradingAnswerPayloadDto(new[] { option1.Id }, null, null));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.False(result.IsCorrect);
        Assert.Equal(0m, result.PointsEarned);
    }

    [Fact]
    public void TrueFalseStrategy_Correct_AwardsPoints()
    {
        var strategy = new TrueFalseGradingStrategy();
        var optTrue = new GradingOptionItemDto(Guid.NewGuid(), 1, "True", null, null, true);
        var optFalse = new GradingOptionItemDto(Guid.NewGuid(), 2, "False", null, null, false);

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "TRUE_FALSE",
            AllowMultiple: false,
            MaxPoints: 5m,
            new[] { optTrue, optFalse },
            null,
            new GradingAnswerPayloadDto(new[] { optTrue.Id }, null, null));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.True(result.IsCorrect);
        Assert.Equal(5m, result.PointsEarned);
    }

    [Fact]
    public void FillBlankStrategy_MultiBlank_CorrectParts_AwardsProportionalPoints()
    {
        var strategy = new FillBlankGradingStrategy();
        var blank1 = new GradingOptionItemDto(Guid.NewGuid(), 1, "Hanoi", null, 1, true);
        var blank2 = new GradingOptionItemDto(Guid.NewGuid(), 2, "Vietnam", null, 2, true);

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "FILL_BLANK",
            AllowMultiple: false,
            MaxPoints: 10m,
            new[] { blank1, blank2 },
            null,
            new GradingAnswerPayloadDto(null, "Hanoi; Thailand", null));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.False(result.IsCorrect);
        Assert.Equal(5m, result.PointsEarned);
    }

    [Fact]
    public void MatchingStrategy_AllMatchesCorrect_AwardsFullPoints()
    {
        var strategy = new MatchingGradingStrategy();
        var match1Id = Guid.NewGuid();
        var match2Id = Guid.NewGuid();
        var opt1 = new GradingOptionItemDto(match1Id, 1, "Term A", "Definition A", null, true);
        var opt2 = new GradingOptionItemDto(match2Id, 2, "Term B", "Definition B", null, true);

        var matches = new Dictionary<Guid, string>
        {
            [match1Id] = "Definition A",
            [match2Id] = "Definition B"
        };

        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "MATCHING",
            AllowMultiple: false,
            MaxPoints: 8m,
            new[] { opt1, opt2 },
            null,
            new GradingAnswerPayloadDto(null, null, matches));

        var result = strategy.Grade(question);

        Assert.False(result.PendingManual);
        Assert.True(result.IsCorrect);
        Assert.Equal(8m, result.PointsEarned);
    }

    [Fact]
    public void EssayStrategy_AlwaysReturnsPendingManual()
    {
        var strategy = new EssayGradingStrategy();
        var question = new GradingQuestionItemDto(
            Guid.NewGuid(),
            1,
            "ESSAY",
            AllowMultiple: false,
            MaxPoints: 20m,
            Array.Empty<GradingOptionItemDto>(),
            null,
            new GradingAnswerPayloadDto(null, "Student essay response text", null));

        var result = strategy.Grade(question);

        Assert.True(result.PendingManual);
        Assert.Null(result.PointsEarned);
        Assert.Null(result.IsCorrect);
    }

    [Fact]
    public void AssessmentContract_GradeQuizAttempt_Idempotent_UpsertsRecord()
    {
        var attemptId = Guid.NewGuid();
        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var qId = Guid.NewGuid();
        var optId = Guid.NewGuid();

        var fakeLearningContract = new FakeLearningContract
        {
            AttemptToReturn = new AttemptForGradingDto(
                attemptId,
                courseId,
                blockId,
                userId,
                50.0m,
                new[]
                {
                    new GradingQuestionItemDto(
                        qId,
                        1,
                        "MULTIPLE_CHOICE",
                        false,
                        10m,
                        new[] { new GradingOptionItemDto(optId, 1, "Option 1", null, null, true) },
                        null,
                        new GradingAnswerPayloadDto(new[] { optId }, null, null))
                })
        };

        var fakeRepo = new FakeAssessmentRepository
        {
            ComponentToReturn = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", blockId, "Quiz", 10m, 1.0m)
        };

        var strategies = new IGradingStrategy[]
        {
            new MultipleChoiceGradingStrategy(),
            new TrueFalseGradingStrategy(),
            new FillBlankGradingStrategy(),
            new MatchingGradingStrategy(),
            new EssayGradingStrategy()
        };

        var service = new AssessmentContractService(
            fakeRepo,
            fakeLearningContract,
            strategies,
            NullLogger<AssessmentContractService>.Instance);

        // First call
        var res1 = service.GradeQuizAttempt(attemptId);
        Assert.True(res1.IsSuccess);
        Assert.Equal(10m, res1.Value.TotalScore);
        Assert.True(res1.Value.IsPassed);

        // Second call (idempotent upsert)
        var res2 = service.GradeQuizAttempt(attemptId);
        Assert.True(res2.IsSuccess);
        Assert.Equal(10m, res2.Value.TotalScore);
        Assert.NotNull(fakeRepo.SavedRecord);
    }

    private sealed class FakeLearningContract : ILearningContract
    {
        public AttemptForGradingDto? AttemptToReturn { get; set; }

        public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId) =>
            AttemptToReturn != null ? Result.Success(AttemptToReturn) : Result.Failure<AttemptForGradingDto>(Error.NotFound("Not found"));

        public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId) => throw new NotImplementedException();
        public Result<bool> IsBlockCompleted(Guid userId, Guid blockId) => throw new NotImplementedException();
        public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId) => throw new NotImplementedException();
        public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback) => throw new NotImplementedException();
        public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId) => throw new NotImplementedException();
        public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt) => throw new NotImplementedException();
        public Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId) => throw new NotImplementedException();
        public Result SoftDeleteComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
        public Result RestoreComment(Guid commentId, Guid actorAdminId) => throw new NotImplementedException();
        public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId) => throw new NotImplementedException();
    }

    private sealed class FakeAssessmentRepository : IAssessmentRepository
    {
        public GradeRecord? SavedRecord { get; set; }
        public AssessmentComponent? ComponentToReturn { get; set; }

        public Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default) =>
            Task.FromResult(SavedRecord?.SourceAttemptId == sourceAttemptId ? SavedRecord : null);

        public Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default) =>
            Task.FromResult(ComponentToReturn);

        public Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1, CancellationToken ct = default) =>
            Task.FromResult(ComponentToReturn ?? new AssessmentComponent(Guid.NewGuid(), courseId, sourceKind, sourceBlockId, title, maxScore, courseWeight));

        public Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<AssessmentConfig?>(null);

        public Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default)
        {
            SavedRecord = record;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(SavedRecord != null ? new[] { SavedRecord } : Array.Empty<GradeRecord>());

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(SavedRecord != null ? new[] { SavedRecord } : Array.Empty<GradeRecord>());

        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }
}
