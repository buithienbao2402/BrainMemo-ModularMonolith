using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Commands.DeleteComponent;
using BrainMemo.Assessment.Application.Commands.UpdateAssessmentConfig;
using BrainMemo.Assessment.Application.Commands.UpsertComponent;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.GetAssessmentConfig;
using BrainMemo.Assessment.Application.Queries.GetComponentScores;
using BrainMemo.Assessment.Application.Queries.GetMyGradebook;
using BrainMemo.Assessment.Application.Queries.ListAssessableBlocks;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Assessment.UnitTests;

public class GradebookAndEvaluationRulesTests
{
    private sealed class FakeContentContract : IContentContract
    {
        public List<AssessableBlockDto> Blocks { get; set; } = [];
        public Dictionary<Guid, AssignmentDefinitionDto> Assignments { get; set; } = [];

        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) =>
            Result.Success<IReadOnlyList<AssessableBlockDto>>(Blocks);

        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) =>
            Assignments.TryGetValue(assignmentBlockId, out var def)
                ? Result.Success(def)
                : Result.Failure<AssignmentDefinitionDto>(Error.NotFound("Not found"));

        public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds) => throw new NotImplementedException();
        public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<int> CountPublishedChapters(Guid courseId) => throw new NotImplementedException();
        public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId) => throw new NotImplementedException();
        public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId) => throw new NotImplementedException();
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

    private sealed class FakeIdentityContract : IIdentityContract
    {
        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            var summaries = userIds.Select(id => new UserSummaryDto(id, "Active", DateTimeOffset.UtcNow, $"user{id.ToString()[..4]}@test.com")).ToList();
            return Task.FromResult(Result.Success<IReadOnlyList<UserSummaryDto>>(summaries));
        }

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class InMemoryRepo : IAssessmentRepository
    {
        public readonly List<GradeRecord> Records = [];
        public readonly List<AssessmentComponent> Components = [];
        public AssessmentConfig? Config { get; set; }

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

        public Task<IReadOnlyList<AssessmentComponent>> GetComponentsByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<AssessmentComponent>>(Components.Where(c => c.CourseId == courseId).ToList());

        public Task DeleteComponentAsync(AssessmentComponent component, CancellationToken ct = default)
        {
            Components.Remove(component);
            return Task.CompletedTask;
        }

        public Task<bool> HasGradeRecordsForComponentAsync(Guid componentId, CancellationToken ct = default) =>
            Task.FromResult(Records.Any(r => r.ComponentId == componentId));

        public Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Config);

        public Task<AssessmentConfig> GetOrCreateConfigAsync(Guid courseId, CancellationToken ct = default)
        {
            Config ??= new AssessmentConfig(Guid.NewGuid(), courseId);
            return Task.FromResult(Config);
        }

        public Task AddConfigAsync(AssessmentConfig config, CancellationToken ct = default)
        {
            Config = config;
            return Task.CompletedTask;
        }

        public Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default)
        {
            var idx = Records.FindIndex(r => r.Id == record.Id);
            if (idx >= 0) Records[idx] = record;
            else Records.Add(record);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => r.CourseId == courseId && r.UserId == userId).ToList());

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => r.CourseId == courseId).ToList());

        public Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForComponentAsync(Guid courseId, Guid componentId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => r.CourseId == courseId && r.ComponentId == componentId).ToList());

        public Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Array.Empty<GradeRecord>());

        public Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind, CancellationToken ct = default) => Task.FromResult(0);

        public List<Clo> Clos { get; } = new();
        public List<Plo> Plos { get; } = new();
        public List<ComponentOutcomeWeight> OutcomeWeights { get; } = new();

        public Task<IReadOnlyList<Clo>> GetClosByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Clo>>(Clos.Where(c => c.CourseId == courseId).ToList());

        public Task<Clo?> GetCloByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Clos.FirstOrDefault(c => c.Id == id));

        public Task<Clo?> GetCloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default) =>
            Task.FromResult(Clos.FirstOrDefault(c => c.CourseId == courseId && c.Code == code));

        public Task AddCloAsync(Clo clo, CancellationToken ct = default)
        {
            Clos.Add(clo);
            return Task.CompletedTask;
        }

        public Task DeleteCloAsync(Clo clo, CancellationToken ct = default)
        {
            Clos.Remove(clo);
            return Task.CompletedTask;
        }

        public Task<bool> HasOutcomeWeightsForCloAsync(Guid cloId, CancellationToken ct = default) =>
            Task.FromResult(OutcomeWeights.Any(w => w.CloId == cloId));

        public Task<IReadOnlyList<Plo>> GetPlosByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Plo>>(Plos.Where(p => p.CourseId == courseId).ToList());

        public Task<Plo?> GetPloByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Plos.FirstOrDefault(p => p.Id == id));

        public Task<Plo?> GetPloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default) =>
            Task.FromResult(Plos.FirstOrDefault(p => p.CourseId == courseId && p.Code == code));

        public Task AddPloAsync(Plo plo, CancellationToken ct = default)
        {
            Plos.Add(plo);
            return Task.CompletedTask;
        }

        public Task DeletePloAsync(Plo plo, CancellationToken ct = default)
        {
            Plos.Remove(plo);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByCourseIdAsync(Guid courseId, CancellationToken ct = default)
        {
            var compIds = Components.Where(c => c.CourseId == courseId).Select(c => c.Id).ToHashSet();
            return Task.FromResult<IReadOnlyList<ComponentOutcomeWeight>>(OutcomeWeights.Where(w => compIds.Contains(w.ComponentId)).ToList());
        }

        public Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByComponentIdAsync(Guid componentId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<ComponentOutcomeWeight>>(OutcomeWeights.Where(w => w.ComponentId == componentId).ToList());

        public Task ReplaceComponentOutcomeWeightsAsync(Guid componentId, IEnumerable<ComponentOutcomeWeight> weights, CancellationToken ct = default)
        {
            OutcomeWeights.RemoveAll(w => w.ComponentId == componentId);
            OutcomeWeights.AddRange(weights);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    [Fact]
    public void ScoreSelectionRules_Highest_Latest_Average_CalculatesCorrectly()
    {
        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var comp = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", blockId, "Kiểm tra 1", 10m, 1.0m);
        var components = new[] { comp };
        var blocks = new[] { new AssessableBlockDto(blockId, courseId, Guid.NewGuid(), "QUIZ", "Kiểm tra 1", 10m) };

        var attempt1 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 6.0m, 10m, true, DateTimeOffset.UtcNow.AddHours(-2));
        var attempt2 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 9.0m, 10m, true, DateTimeOffset.UtcNow.AddHours(-1));
        var attempt3 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 7.5m, 10m, true, DateTimeOffset.UtcNow);

        var records = new[] { attempt1, attempt2, attempt3 };
        var dueDates = new Dictionary<Guid, DateTimeOffset?>();
        var learner = new GradebookLearnerDto(userId, "Student 1");

        // 1. HIGHEST
        var configHighest = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, scoreSelectionRule: "HIGHEST");
        var gbHighest = GradebookCalculator.ComputeGradebook(configHighest, components, blocks, records, dueDates, learner, DateTimeOffset.UtcNow);
        Assert.Equal(9.0m, gbHighest.Components[0].Highest);
        Assert.Equal(7.5m, gbHighest.Components[0].Latest);
        Assert.Equal(7.5m, gbHighest.Components[0].Average);
        Assert.Equal(9.0m, gbHighest.Components[0].Final);

        // 2. LATEST
        var configLatest = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, scoreSelectionRule: "LATEST");
        var gbLatest = GradebookCalculator.ComputeGradebook(configLatest, components, blocks, records, dueDates, learner, DateTimeOffset.UtcNow);
        Assert.Equal(7.5m, gbLatest.Components[0].Final);

        // 3. AVERAGE
        var configAverage = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, scoreSelectionRule: "AVERAGE");
        var gbAverage = GradebookCalculator.ComputeGradebook(configAverage, components, blocks, records, dueDates, learner, DateTimeOffset.UtcNow);
        Assert.Equal(7.5m, gbAverage.Components[0].Final);
    }

    [Fact]
    public void PastDueItem_WithoutSubmission_AwardsZeroScore()
    {
        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var comp = new AssessmentComponent(Guid.NewGuid(), courseId, "ASSIGNMENT", blockId, "Bài tập lớn", 10m, 1.0m);
        var components = new[] { comp };
        var blocks = new[] { new AssessableBlockDto(blockId, courseId, Guid.NewGuid(), "ASSIGNMENT", "Bài tập lớn", 10m) };

        var records = Array.Empty<GradeRecord>();
        var dueDates = new Dictionary<Guid, DateTimeOffset?>
        {
            [blockId] = DateTimeOffset.UtcNow.AddDays(-2) // Past due
        };
        var learner = new GradebookLearnerDto(userId, "Student 1");

        var config = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, scoreSelectionRule: "HIGHEST");
        var gb = GradebookCalculator.ComputeGradebook(config, components, blocks, records, dueDates, learner, DateTimeOffset.UtcNow);

        Assert.Equal(0m, gb.Components[0].Final);
        Assert.Equal("NOT_STARTED", gb.Components[0].Status);
        Assert.False(gb.Components[0].IsPassed);
        Assert.Equal(0m, gb.TotalGrade);
        Assert.Equal("Kém", gb.Classification);
    }

    [Fact]
    public void NotDueItem_WithoutSubmission_DoesNotPenalizeTotalGrade()
    {
        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var block1 = Guid.NewGuid();
        var block2 = Guid.NewGuid();

        var comp1 = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", block1, "Quiz 1", 10m, 1.0m);
        var comp2 = new AssessmentComponent(Guid.NewGuid(), courseId, "ASSIGNMENT", block2, "Bài tập sắp tới", 10m, 1.0m);
        var components = new[] { comp1, comp2 };

        var record1 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp1.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 8.0m, 10m, true, DateTimeOffset.UtcNow);
        var records = new[] { record1 };

        var dueDates = new Dictionary<Guid, DateTimeOffset?>
        {
            [block2] = DateTimeOffset.UtcNow.AddDays(5) // In the future
        };
        var learner = new GradebookLearnerDto(userId, "Student 1");

        var config = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, scoreSelectionRule: "HIGHEST");
        var gb = GradebookCalculator.ComputeGradebook(config, components, Array.Empty<AssessableBlockDto>(), records, dueDates, learner, DateTimeOffset.UtcNow);

        Assert.Equal(8.0m, gb.Components[0].Final);
        Assert.Null(gb.Components[1].Final);
        Assert.Equal("NOT_STARTED", gb.Components[1].Status);

        // Total grade only considers completed components
        Assert.Equal(8.0m, gb.TotalGrade);
        Assert.Equal("Giỏi", gb.Classification);
    }

    [Fact]
    public async Task DeleteComponent_WithGradeRecords_ReturnsConflict()
    {
        var repo = new InMemoryRepo();
        var handler = new DeleteComponentCommandHandler(repo);

        var courseId = Guid.NewGuid();
        var blockId = Guid.NewGuid();
        var comp = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", blockId, "Quiz 1", 10m, 1.0m);
        repo.Components.Add(comp);

        repo.Records.Add(new GradeRecord(
            Guid.NewGuid(), Guid.NewGuid(), courseId, comp.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 8.0m, 10m, true, DateTimeOffset.UtcNow));

        var res = await handler.Handle(new DeleteComponentCommand(courseId, blockId), CancellationToken.None);
        Assert.False(res.IsSuccess);
        Assert.Equal("COMP_HAS_RECORDS", res.Error.Code);
    }

    [Fact]
    public async Task UpdateAssessmentConfig_And_GetAssessmentConfig_PersistsCorrectly()
    {
        var repo = new InMemoryRepo();
        var updateHandler = new UpdateAssessmentConfigCommandHandler(repo);
        var getHandler = new GetAssessmentConfigQueryHandler(repo);

        var courseId = Guid.NewGuid();

        var updateCmd = new UpdateAssessmentConfigCommand(
            CourseId: courseId,
            PassThreshold: 60.0m,
            ScoreSelectionRule: "AVERAGE",
            GradeScale: new[]
            {
                new GradeScaleItemDto(8.5m, 10m, "A"),
                new GradeScaleItemDto(7.0m, 8.49m, "B"),
                new GradeScaleItemDto(5.5m, 6.99m, "C"),
                new GradeScaleItemDto(4.0m, 5.49m, "D"),
                new GradeScaleItemDto(0m, 3.99m, "F")
            },
            AchievementLevels: null,
            BloomScale: null,
            PloEnabled: true);

        var updateRes = await updateHandler.Handle(updateCmd, CancellationToken.None);
        Assert.True(updateRes.IsSuccess);
        Assert.Equal(60.0m, updateRes.Value.PassThreshold);
        Assert.Equal("AVERAGE", updateRes.Value.ScoreSelectionRule);
        Assert.True(updateRes.Value.PloEnabled);

        var getRes = await getHandler.Handle(new GetAssessmentConfigQuery(courseId), CancellationToken.None);
        Assert.True(getRes.IsSuccess);
        Assert.Equal(60.0m, getRes.Value.PassThreshold);
        Assert.Equal("AVERAGE", getRes.Value.ScoreSelectionRule);
        Assert.Equal(5, getRes.Value.GradeScale?.Count);
    }
}
