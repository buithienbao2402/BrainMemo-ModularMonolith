using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Outcomes.Commands.CreateClo;
using BrainMemo.Assessment.Application.Outcomes.Commands.CreatePlo;
using BrainMemo.Assessment.Application.Outcomes.Commands.DeleteClo;
using BrainMemo.Assessment.Application.Outcomes.Commands.DeletePlo;
using BrainMemo.Assessment.Application.Queries.ExportAssessment;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Assessment.UnitTests;

public class CloAndPloEngineTests
{
    private class FakeAssessmentRepo : IAssessmentRepository
    {
        public List<AssessmentComponent> Components { get; } = new();
        public List<GradeRecord> Records { get; } = new();
        public List<Clo> Clos { get; } = new();
        public List<Plo> Plos { get; } = new();
        public List<ComponentOutcomeWeight> OutcomeWeights { get; } = new();
        public Dictionary<Guid, AssessmentConfig> Configs { get; } = new();

        public Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.SourceAttemptId == sourceAttemptId));

        public Task<GradeRecord?> GetGradeRecordBySourceSubmissionIdAsync(Guid sourceSubmissionId, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.SourceSubmissionId == sourceSubmissionId));

        public Task<GradeRecord?> GetGradeRecordByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Records.FirstOrDefault(r => r.Id == id));

        public Task<AssessmentComponent?> GetComponentByIdAsync(Guid componentId, CancellationToken ct = default) =>
            Task.FromResult(Components.FirstOrDefault(c => c.Id == componentId));

        public Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default) =>
            Task.FromResult(Components.FirstOrDefault(c => c.CourseId == courseId && c.SourceBlockId == sourceBlockId));

        public Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1, CancellationToken ct = default)
        {
            var comp = Components.FirstOrDefault(c => c.CourseId == courseId && c.SourceBlockId == sourceBlockId);
            if (comp == null)
            {
                comp = new AssessmentComponent(Guid.NewGuid(), courseId, sourceKind, sourceBlockId, title, maxScore, courseWeight);
                Components.Add(comp);
            }
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
            Task.FromResult(Configs.TryGetValue(courseId, out var cfg) ? cfg : null);

        public Task<AssessmentConfig> GetOrCreateConfigAsync(Guid courseId, CancellationToken ct = default)
        {
            if (!Configs.TryGetValue(courseId, out var cfg))
            {
                cfg = new AssessmentConfig(Guid.NewGuid(), courseId);
                Configs[courseId] = cfg;
            }
            return Task.FromResult(cfg);
        }

        public Task AddConfigAsync(AssessmentConfig config, CancellationToken ct = default)
        {
            Configs[config.CourseId] = config;
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

        public Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind = null, int page = 1, int pageSize = 20, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<GradeRecord>>(Records.Where(r => !r.IsFullyGraded).ToList());

        public Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind = null, CancellationToken ct = default) =>
            Task.FromResult(Records.Count(r => !r.IsFullyGraded));

        public Task<IReadOnlyList<Clo>> GetClosByCourseIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Clo>>(Clos.Where(c => c.CourseId == courseId).ToList());

        public Task<Clo?> GetCloByIdAsync(Guid id, CancellationToken ct = default) =>
            Task.FromResult(Clos.FirstOrDefault(c => c.Id == id));

        public Task<Clo?> GetCloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default) =>
            Task.FromResult(Clos.FirstOrDefault(c => c.CourseId == courseId && c.Code.Equals(code, StringComparison.OrdinalIgnoreCase)));

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
            Task.FromResult(Plos.FirstOrDefault(p => p.CourseId == courseId && p.Code.Equals(code, StringComparison.OrdinalIgnoreCase)));

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
    }

    private class FakeCourseContract : ICourseContract
    {
        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal) => throw new NotImplementedException();
        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId) => throw new NotImplementedException();
        public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId) => throw new NotImplementedException();
        public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId) => throw new NotImplementedException();
        public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId) => throw new NotImplementedException();
        public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor) => throw new NotImplementedException();
        public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId) => throw new NotImplementedException();
        public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) =>
            Result.Success(new Page<Guid>([], null, false));
        public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => throw new NotImplementedException();
        public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => throw new NotImplementedException();
        public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => throw new NotImplementedException();
    }

    private class FakeContentContract : IContentContract
    {
        public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId) =>
            Result.Success<IReadOnlyList<AssessableBlockDto>>([]);
        public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId) =>
            Result.Failure<AssignmentDefinitionDto>(Error.NotFound("Not found"));
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

    private class FakeIdentityContract : IIdentityContract
    {
        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            var summaries = userIds.Select(id => new UserSummaryDto(id, "Active", DateTimeOffset.UtcNow, $"user_{id.ToString()[..4]}@test.com")).ToList();
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

    [Fact]
    public async Task CreateClo_DuplicateCodeInCourse_FailsWithConflict()
    {
        var repo = new FakeAssessmentRepo();
        var courseId = Guid.NewGuid();
        var handler = new CreateCloCommandHandler(repo);

        var first = await handler.Handle(new CreateCloCommand(courseId, "CLO1", "Description 1", null, new[] { Guid.NewGuid() }), CancellationToken.None);
        Assert.True(first.IsSuccess);

        var duplicate = await handler.Handle(new CreateCloCommand(courseId, "clo1", "Duplicate code"), CancellationToken.None);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("CLO_CODE_EXISTS", duplicate.Error.Code);
    }

    [Fact]
    public async Task CreatePlo_DuplicateCodeInCourse_FailsWithConflict()
    {
        var repo = new FakeAssessmentRepo();
        var courseId = Guid.NewGuid();
        var handler = new CreatePloCommandHandler(repo);

        var first = await handler.Handle(new CreatePloCommand(courseId, "PLO1", "Program outcome 1"), CancellationToken.None);
        Assert.True(first.IsSuccess);

        var duplicate = await handler.Handle(new CreatePloCommand(courseId, "PLO1", "Duplicate PLO"), CancellationToken.None);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("PLO_CODE_EXISTS", duplicate.Error.Code);
    }

    [Fact]
    public async Task DeleteClo_WithLinkedOutcomeWeights_FailsWithConflict()
    {
        var repo = new FakeAssessmentRepo();
        var courseId = Guid.NewGuid();
        var clo = new Clo(Guid.NewGuid(), courseId, "CLO1", "Desc", null);
        repo.Clos.Add(clo);
        var comp = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", Guid.NewGuid(), "Quiz", 10m, 1m);
        repo.Components.Add(comp);
        repo.OutcomeWeights.Add(new ComponentOutcomeWeight(Guid.NewGuid(), comp.Id, clo.Id, 1.0m));

        var handler = new DeleteCloCommandHandler(repo);
        var result = await handler.Handle(new DeleteCloCommand(courseId, clo.Id), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal("CLO_IN_USE", result.Error.Code);
    }

    [Fact]
    public async Task DeletePlo_RemovesReferenceFromLinkedClos()
    {
        var repo = new FakeAssessmentRepo();
        var courseId = Guid.NewGuid();
        var ploId = Guid.NewGuid();
        var plo = new Plo(ploId, courseId, "PLO1", "Desc");
        repo.Plos.Add(plo);

        var clo = new Clo(Guid.NewGuid(), courseId, "CLO1", "Desc", bloomLevelCode: null, linkedPloIds: new List<Guid> { ploId, Guid.NewGuid() });
        repo.Clos.Add(clo);

        var handler = new DeletePloCommandHandler(repo);
        var result = await handler.Handle(new DeletePloCommand(courseId, ploId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain(ploId, clo.LinkedPloIds);
        Assert.Single(clo.LinkedPloIds);
    }

    [Fact]
    public void CloAndPlo_AchievementFormula352_CalculatesAccurately()
    {
        var courseId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var learner = new GradebookLearnerDto(userId, "Nguyen Van A");

        var ploId = Guid.NewGuid();
        var cloId = Guid.NewGuid();

        var plo = new Plo(ploId, courseId, "PLO1", "Standard Outcome 1");
        var clo = new Clo(cloId, courseId, "CLO1", "Course Learning Outcome 1", bloomLevelCode: null, linkedPloIds: new List<Guid> { ploId });

        // Comp 1: Quiz, max 10, student gets 8.0 -> t1 = 0.8. Weight to CLO1 = 2.0
        var block1 = Guid.NewGuid();
        var comp1 = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", block1, "Quiz 1", 10m, 1.0m);
        var record1 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp1.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 8.0m, 10m, true, DateTimeOffset.UtcNow);

        // Comp 2: Assignment, max 20, student gets 15.0 -> t2 = 0.75. Weight to CLO1 = 3.0
        var block2 = Guid.NewGuid();
        var comp2 = new AssessmentComponent(Guid.NewGuid(), courseId, "ASSIGNMENT", block2, "Assignment 1", 20m, 1.0m);
        var record2 = new GradeRecord(Guid.NewGuid(), userId, courseId, comp2.Id, GradeRecordType.AssignmentSubmission, null, Guid.NewGuid(), 15.0m, 20m, true, DateTimeOffset.UtcNow);

        var weights = new[]
        {
            new ComponentOutcomeWeight(Guid.NewGuid(), comp1.Id, cloId, 2.0m),
            new ComponentOutcomeWeight(Guid.NewGuid(), comp2.Id, cloId, 3.0m)
        };

        var config = new AssessmentConfig(Guid.NewGuid(), courseId, passThreshold: 50m, ploEnabled: true);
        var components = new[] { comp1, comp2 };
        var records = new[] { record1, record2 };

        var gradebook = GradebookCalculator.ComputeGradebook(
            config,
            components,
            Array.Empty<AssessableBlockDto>(),
            records,
            new Dictionary<Guid, DateTimeOffset?>(),
            learner,
            DateTimeOffset.UtcNow,
            new[] { clo },
            new[] { plo },
            weights);

        // Calculation: (2.0 * 0.8 + 3.0 * 0.75) / (2.0 + 3.0) = (1.6 + 2.25) / 5.0 = 3.85 / 5.0 = 77.0%
        Assert.NotNull(gradebook.CloAchievements);
        Assert.Single(gradebook.CloAchievements);
        var cloAch = gradebook.CloAchievements[0];
        Assert.Equal("CLO1", cloAch.Code);
        Assert.Equal(77.0m, cloAch.Pct);
        Assert.True(cloAch.Achieved);
        Assert.Equal("Tốt", cloAch.Level);
        Assert.True(gradebook.AllCloAchieved);

        // PLO is average of linked CLOs = 77.0%
        Assert.NotNull(gradebook.PloAchievements);
        Assert.Single(gradebook.PloAchievements);
        var ploAch = gradebook.PloAchievements[0];
        Assert.Equal("PLO1", ploAch.Code);
        Assert.Equal(77.0m, ploAch.Pct);
        Assert.True(ploAch.Achieved);
    }

    [Fact]
    public async Task ExportAssessment_ProducesValidCsv()
    {
        var repo = new FakeAssessmentRepo();
        var courseContract = new FakeCourseContract();
        var contentContract = new FakeContentContract();
        var identityContract = new FakeIdentityContract();
        var courseId = Guid.NewGuid();

        var comp = new AssessmentComponent(Guid.NewGuid(), courseId, "QUIZ", Guid.NewGuid(), "Quiz 1", 10m, 1.0m);
        repo.Components.Add(comp);

        var studentId = Guid.NewGuid();
        repo.Records.Add(new GradeRecord(Guid.NewGuid(), studentId, courseId, comp.Id, GradeRecordType.QuizAttempt, Guid.NewGuid(), null, 9.5m, 10m, true, DateTimeOffset.UtcNow));

        var handler = new ExportAssessmentQueryHandler(repo, courseContract, contentContract, identityContract);
        var result = await handler.Handle(new ExportAssessmentQuery(courseId, "csv"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("text/csv; charset=utf-8", result.Value.ContentType);
        Assert.Contains(".csv", result.Value.FileName);

        var csv = System.Text.Encoding.UTF8.GetString(result.Value.Content);
        Assert.Contains("ID Học viên", csv);
        Assert.Contains("Quiz 1", csv);
        Assert.Contains("Điểm tổng kết", csv);
        Assert.Contains("9.5", csv);
    }
}
