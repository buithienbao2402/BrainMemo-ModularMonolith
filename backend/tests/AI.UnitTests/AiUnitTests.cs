using System.Text.Json;
using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Application.Commands;
using BrainMemo.AI.Application.DTOs;
using BrainMemo.AI.Application.Queries;
using BrainMemo.AI.Contracts;
using BrainMemo.AI.Contracts.Dtos;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.AI.Domain.Enums;
using BrainMemo.AI.Infrastructure.Background;
using BrainMemo.AI.Infrastructure.Contracts;
using BrainMemo.AI.Infrastructure.Llm;
using BrainMemo.AI.Infrastructure.Persistence;
using BrainMemo.AI.Infrastructure.Services;
using BrainMemo.BuildingBlocks.Abstractions.Ai;
using BrainMemo.BuildingBlocks.Abstractions.Settings;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace AI.UnitTests;

public class AiDomainTests
{
    [Fact]
    public void AiGenerationJob_StateTransitions_WorkCorrectly()
    {
        Guid jobId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();

        AiGenerationJob job = new(
            jobId,
            userId,
            courseId,
            AiJobType.Quiz,
            AiSourceKind.PastedText,
            "Sample lesson text",
            null,
            "{\"count\":5}");

        Assert.Equal(AiJobStatus.Pending, job.Status);
        Assert.Null(job.StartedAt);
        Assert.Null(job.CompletedAt);

        job.MarkRunning();
        Assert.Equal(AiJobStatus.Running, job.Status);
        Assert.NotNull(job.StartedAt);

        job.MarkCompleted(5);
        Assert.Equal(AiJobStatus.Completed, job.Status);
        Assert.Equal(5, job.ResultCount);
        Assert.NotNull(job.CompletedAt);

        // Test MarkFailed
        AiGenerationJob failedJob = new(
            Guid.NewGuid(),
            userId,
            courseId,
            AiJobType.Flashcard,
            AiSourceKind.Chapter,
            null,
            Guid.NewGuid(),
            "{}");

        failedJob.MarkFailed("LLM Error");
        Assert.Equal(AiJobStatus.Failed, failedJob.Status);
        Assert.Equal("LLM Error", failedJob.ErrorMessage);
        Assert.NotNull(failedJob.CompletedAt);
    }

    [Fact]
    public void AiUserDailyQuota_IncrementsUntilLimitReached()
    {
        Guid quotaId = Guid.NewGuid();
        Guid userId = Guid.NewGuid();
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);

        AiUserDailyQuota quota = new(quotaId, userId, today, 2, 0);

        Assert.True(quota.TryIncrement());
        Assert.Equal(1, quota.UsedCount);

        Assert.True(quota.TryIncrement());
        Assert.Equal(2, quota.UsedCount);

        Assert.False(quota.TryIncrement());
        Assert.Equal(2, quota.UsedCount);

        quota.UpdateLimit(5);
        Assert.Equal(5, quota.QuotaLimit);
        Assert.True(quota.TryIncrement());
        Assert.Equal(3, quota.UsedCount);
    }
}

public class AiCommandAndQueryTests
{
    private static AiDbContext CreateInMemoryDbContext()
    {
        DbContextOptions<AiDbContext> options = new DbContextOptionsBuilder<AiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        return new AiDbContext(options);
    }

    private sealed class FakeIdentityContract(bool isEmailVerified = true, bool isLocked = false, bool isAdmin = false) : IIdentityContract
    {
        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default)
        {
            return Task.FromResult(Result.Success(new AccountStatusDto(
                isLocked ? "LOCKED" : "ACTIVE",
                null,
                null,
                isEmailVerified)));
        }

        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(isAdmin));
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(false));
        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) => throw new NotImplementedException();
    }

    private sealed class FakeCourseContract(bool exists = true, bool isOwner = true) : ICourseContract
    {
        public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
        {
            return Result.Success(new CourseAccessDto(
                exists,
                "ACTIVE",
                "PUBLIC",
                Guid.NewGuid(),
                isOwner,
                isOwner ? "OWNER" : "ACTIVE",
                true,
                true,
                true,
                "OK"));
        }

        public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId) =>
            Result.Success(new ChapterAccessResult(true, true, "OK"));
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

    [Fact]
    public async Task CreateQuizJob_WhenEmailNotVerified_ReturnsError()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        AiJobQueue queue = new();
        FakeIdentityContract idContract = new(isEmailVerified: false);
        FakeCourseContract courseContract = new();

        CreateQuizJobCommandHandler handler = new(repo, queue, idContract, courseContract);

        CreateQuizJobCommand command = new(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "PASTED_TEXT",
            "Sample text",
            null,
            5,
            "EASY",
            null);

        Result<AiJobDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("EMAIL_NOT_VERIFIED", result.Error.Code);
    }

    [Fact]
    public async Task CreateQuizJob_WhenNotCourseOwner_ReturnsForbidden()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        AiJobQueue queue = new();
        FakeIdentityContract idContract = new(isEmailVerified: true);
        FakeCourseContract courseContract = new(exists: true, isOwner: false);

        CreateQuizJobCommandHandler handler = new(repo, queue, idContract, courseContract);

        CreateQuizJobCommand command = new(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "PASTED_TEXT",
            "Sample text",
            null,
            5,
            "EASY",
            null);

        Result<AiJobDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("FORBIDDEN", result.Error.Code);
    }

    [Fact]
    public async Task CreateQuizJob_WhenQuotaExceeded_ReturnsQuotaExceeded()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        AiJobQueue queue = new();
        FakeIdentityContract idContract = new(isEmailVerified: true);
        FakeCourseContract courseContract = new(exists: true, isOwner: true);

        Guid userId = Guid.NewGuid();
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        AiUserDailyQuota quota = new(Guid.NewGuid(), userId, today, 1, 1);
        await db.DailyQuotas.AddAsync(quota);
        await db.SaveChangesAsync();

        CreateQuizJobCommandHandler handler = new(repo, queue, idContract, courseContract);

        CreateQuizJobCommand command = new(
            Guid.NewGuid(),
            userId,
            "PASTED_TEXT",
            "Sample text",
            null,
            5,
            "EASY",
            null);

        Result<AiJobDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("AI_QUOTA_EXCEEDED", result.Error.Code);
    }

    [Fact]
    public async Task CreateQuizJob_SuccessfulCreation_EnqueuesAndReturnsPendingJob()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        AiJobQueue queue = new();
        FakeIdentityContract idContract = new(isEmailVerified: true);
        FakeCourseContract courseContract = new(exists: true, isOwner: true);

        Guid userId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();

        CreateQuizJobCommandHandler handler = new(repo, queue, idContract, courseContract);

        CreateQuizJobCommand command = new(
            courseId,
            userId,
            "PASTED_TEXT",
            "This is lesson content about physics.",
            null,
            5,
            "MEDIUM",
            new[] { "MULTIPLE_CHOICE" });

        Result<AiJobDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("QUIZ", result.Value.JobType);
        Assert.Equal("PENDING", result.Value.Status);

        // Verify job in database
        AiGenerationJob? savedJob = await repo.GetJobByIdAsync(result.Value.Id);
        Assert.NotNull(savedJob);
        Assert.Equal(AiJobStatus.Pending, savedJob.Status);

        // Verify dequeued
        Guid queuedId = await queue.DequeueAsync();
        Assert.Equal(result.Value.Id, queuedId);
    }

    [Fact]
    public async Task CreateFlashcardJob_MissingSourceChapterId_ReturnsInvalidInput()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        AiJobQueue queue = new();
        FakeIdentityContract idContract = new(isEmailVerified: true);
        FakeCourseContract courseContract = new(exists: true, isOwner: true);

        CreateFlashcardJobCommandHandler handler = new(repo, queue, idContract, courseContract);

        CreateFlashcardJobCommand command = new(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "CHAPTER",
            null,
            null, // missing
            5);

        Result<AiJobDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_INPUT", result.Error.Code);
    }

    [Fact]
    public async Task GetAiQuota_ReturnsCorrectCalculations()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        Guid userId = Guid.NewGuid();
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);

        AiUserDailyQuota quota = new(Guid.NewGuid(), userId, today, 20, 7);
        await db.DailyQuotas.AddAsync(quota);
        await db.SaveChangesAsync();

        GetAiQuotaQueryHandler handler = new(repo);
        Result<AiQuotaDto> result = await handler.Handle(new GetAiQuotaQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(7, result.Value.Used);
        Assert.Equal(20, result.Value.Limit);
        Assert.Equal(13, result.Value.Remaining);
    }

    [Fact]
    public async Task AdminSettings_GetAndSet_WorksForAdmin()
    {
        using AiDbContext db = CreateInMemoryDbContext();
        AiRepository repo = new(db);
        FakeIdentityContract idContract = new(isAdmin: true);

        UpdateAdminSettingsCommandHandler updateHandler = new(repo, idContract);
        Guid adminId = Guid.NewGuid();

        Result<SystemSettingsDto> updateResult = await updateHandler.Handle(
            new UpdateAdminSettingsCommand(35, "OPENAI", adminId),
            CancellationToken.None);

        Assert.True(updateResult.IsSuccess);
        Assert.Equal(35, updateResult.Value.AiDailyQuota);
        Assert.Equal("OPENAI", updateResult.Value.AiLlmProvider);

        GetAdminSettingsQueryHandler getHandler = new(repo, idContract);
        Result<SystemSettingsDto> getResult = await getHandler.Handle(
            new GetAdminSettingsQuery(adminId),
            CancellationToken.None);

        Assert.True(getResult.IsSuccess);
        Assert.Equal(35, getResult.Value.AiDailyQuota);
        Assert.Equal("OPENAI", getResult.Value.AiLlmProvider);
    }
}

public class GeminiLlmClientTests
{
    [Fact]
    public async Task GenerateJson_SimulatedMode_ReturnsValidJsonStructure()
    {
        HttpClient client = new();
        IConfiguration config = new ConfigurationBuilder().Build();
        GeminiLlmClient llmClient = new(client, config, NullLogger<GeminiLlmClient>.Instance);

        LlmResult quizResult = await llmClient.GenerateJson(
            "Tạo quiz",
            "Nội dung bài học",
            TimeSpan.FromSeconds(5));

        Assert.True(quizResult.IsSuccess);
        Assert.NotNull(quizResult.JsonContent);

        // Verify parsable as json
        using JsonDocument quizDoc = JsonDocument.Parse(quizResult.JsonContent);
        Assert.True(quizDoc.RootElement.GetArrayLength() > 0);

        LlmResult flashcardResult = await llmClient.GenerateJson(
            "Tạo flashcard",
            "Nội dung bài học",
            TimeSpan.FromSeconds(5));

        Assert.True(flashcardResult.IsSuccess);
        Assert.NotNull(flashcardResult.JsonContent);

        using JsonDocument fcDoc = JsonDocument.Parse(flashcardResult.JsonContent);
        Assert.True(fcDoc.RootElement.GetArrayLength() > 0);
    }
}

public class AiContractServiceTests
{
    [Fact]
    public void AiContractService_ReturnsDailyQuota()
    {
        DbContextOptions<AiDbContext> options = new DbContextOptionsBuilder<AiDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;
        using AiDbContext db = new(options);
        AiRepository repo = new(db);

        Guid userId = Guid.NewGuid();
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        AiUserDailyQuota quota = new(Guid.NewGuid(), userId, today, 10, 3);
        db.DailyQuotas.Add(quota);
        db.SaveChanges();

        AiContractService service = new(repo);
        Result<DailyQuotaDto> result = service.GetDailyQuota(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value.Used);
        Assert.Equal(10, result.Value.Limit);
        Assert.Equal(7, result.Value.Remaining);
    }
}
