using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace Content.UnitTests;

public sealed class FakeEventBus : IEventBus
{
    public List<IntegrationEvent> PublishedEvents { get; } = [];

    public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
    {
        PublishedEvents.Add(@event);
        return Task.CompletedTask;
    }
}

public sealed class FakeSystemClock(DateTimeOffset utcNow) : IClock
{
    public DateTimeOffset UtcNow { get; set; } = utcNow;
}

public sealed class FakeFileStorage : IFileStorage
{
    private readonly Dictionary<string, FileHead> _heads = [];
    public List<string> DeletedKeys { get; } = [];
    public List<(string Source, string Destination)> CommittedKeys { get; } = [];

    public void SetFileHead(string key, FileHead head)
    {
        _heads[key] = head;
    }

    public Task<PresignedUpload> CreateUploadUrl(string tmpKey, string contentType, long maxBytes, TimeSpan ttl, CancellationToken ct = default)
    {
        return Task.FromResult(new PresignedUpload(tmpKey, $"https://storage.local/upload/{tmpKey}", DateTimeOffset.UtcNow.Add(ttl)));
    }

    public Task<FileHead?> Head(string key, CancellationToken ct = default)
    {
        _heads.TryGetValue(key, out FileHead? head);
        return Task.FromResult(head);
    }

    public Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default)
    {
        CommittedKeys.Add((tmpKey, finalKey));
        if (_heads.TryGetValue(tmpKey, out FileHead? head))
        {
            _heads[finalKey] = head;
        }
        return Task.FromResult(finalKey);
    }

    public Task<string> CreateDownloadUrl(string key, TimeSpan ttl, string? downloadName = null, CancellationToken ct = default)
    {
        return Task.FromResult($"https://storage.local/download/{key}?ttl={ttl.TotalSeconds}");
    }

    public Task Delete(string key, CancellationToken ct = default)
    {
        DeletedKeys.Add(key);
        _heads.Remove(key);
        return Task.CompletedTask;
    }

    public Task DeleteByPrefix(string prefix, CancellationToken ct = default)
    {
        List<string> keysToRemove = _heads.Keys.Where(k => k.StartsWith(prefix, StringComparison.Ordinal)).ToList();
        foreach (string k in keysToRemove)
        {
            DeletedKeys.Add(k);
            _heads.Remove(k);
        }
        return Task.CompletedTask;
    }
}

public sealed class FakeCourseContract : ICourseContract
{
    public Dictionary<Guid, (Guid OwnerUserId, string AccessMode, string State)> Courses { get; } = [];
    public HashSet<(Guid CourseId, Guid UserId)> Enrollments { get; } = [];

    public void AddCourse(Guid courseId, Guid ownerUserId, string accessMode = "PUBLIC", string state = "ACTIVE")
    {
        Courses[courseId] = (ownerUserId, accessMode, state);
    }

    public void AddEnrollment(Guid courseId, Guid userId)
    {
        Enrollments.Add((courseId, userId));
    }

    public Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal)
    {
        if (!Courses.TryGetValue(courseId, out var c))
        {
            return Result.Failure<CourseAccessDto>(Error.NotFound("Khóa học không tồn tại."));
        }

        bool isOwner = viewerUserId.HasValue && viewerUserId.Value == c.OwnerUserId;
        bool isEnrolled = viewerUserId.HasValue && Enrollments.Contains((courseId, viewerUserId.Value));
        bool canRead = isOwner || c.AccessMode == "PUBLIC" || isEnrolled;
        string effectiveState = c.State;

        CourseAccessDto dto = new(
            Exists: true,
            EffectiveState: effectiveState,
            AccessMode: c.AccessMode,
            OwnerUserId: c.OwnerUserId,
            IsOwner: isOwner,
            EnrollmentStatus: isEnrolled ? "ENROLLED" : null,
            CanViewInfo: effectiveState == "ACTIVE",
            CanReadContent: canRead && effectiveState == "ACTIVE",
            CanLearn: canRead && effectiveState == "ACTIVE",
            ReasonCode: canRead ? "OK" : "FORBIDDEN");

        return Result.Success(dto);
    }

    public Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId)
    {
        if (!Courses.TryGetValue(courseId, out var c))
        {
            return Result.Success(new ChapterAccessResult(false, false, "NOT_FOUND"));
        }

        bool isOwner = viewerUserId.HasValue && viewerUserId.Value == c.OwnerUserId;
        bool isEnrolled = viewerUserId.HasValue && Enrollments.Contains((courseId, viewerUserId.Value));

        if (isOwner || c.AccessMode == "PUBLIC" || isEnrolled)
        {
            return Result.Success(new ChapterAccessResult(true, true, "OK"));
        }

        return Result.Success(new ChapterAccessResult(false, false, "NOT_ENROLLED"));
    }

    public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId) =>
        Result.Success<IReadOnlyList<CourseSummaryDto>>([]);

    public Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit) =>
        Result.Success(Page<CourseSummaryDto>.Empty());

    public Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId) =>
        Result.Failure<ReportTargetDto>(Error.NotFound("Không tìm thấy"));

    public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId) => Result.Success();
    public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor) => Result.Success();
    public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId) => Result.Success(string.Empty);
    public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit) => Result.Success(Page<Guid>.Empty());
    public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit) => Result.Success(Page<CourseSnapshotDto>.Empty());
    public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit) => Result.Success(Page<EnrollmentFactDto>.Empty());
    public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit) => Result.Success(Page<NominationFactDto>.Empty());
}

public sealed class FakeContentRepository : IContentRepository
{
    public List<Chapter> Chapters { get; } = [];
    public List<ChapterVersion> ChapterVersions { get; } = [];
    public List<Block> Blocks { get; } = [];
    public List<Resource> Resources { get; } = [];
    public List<QuizConfig> QuizConfigs { get; } = [];
    public List<QuizQuestion> QuizQuestions { get; } = [];
    public List<QuizRandomRule> QuizRandomRules { get; } = [];
    public List<QuizPrerequisite> QuizPrerequisites { get; } = [];
    public List<AssignmentConfig> AssignmentConfigs { get; } = [];
    public List<PublishedBlock> PublishedBlocks { get; } = [];
    public List<Question> Questions { get; } = [];
    public List<QuestionTag> QuestionTags { get; } = [];
    public List<QuestionBank> QuestionBanks { get; } = [];

    public Task<Chapter?> GetChapterByIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        Chapter? ch = Chapters.FirstOrDefault(c => c.Id == chapterId && !c.IsDeleted);
        return Task.FromResult(ch);
    }

    public Task<IReadOnlyList<Chapter>> ListChaptersByCourseIdAsync(Guid courseId, bool includeDrafts, CancellationToken ct = default)
    {
        IEnumerable<Chapter> query = Chapters.Where(c => c.CourseId == courseId && !c.IsDeleted);
        if (!includeDrafts)
        {
            query = query.Where(c => c.Status == BrainMemo.Content.Domain.Enums.ChapterStatus.Published);
        }

        IReadOnlyList<Chapter> list = query.OrderBy(c => c.Position).ToList();
        return Task.FromResult(list);
    }

    public Task<int> GetMaxChapterPositionAsync(Guid courseId, CancellationToken ct = default)
    {
        int max = Chapters.Where(c => c.CourseId == courseId && !c.IsDeleted)
                          .Select(c => (int?)c.Position)
                          .Max() ?? 0;
        return Task.FromResult(max);
    }

    public Task AddChapterAsync(Chapter chapter, CancellationToken ct = default)
    {
        Chapters.Add(chapter);
        return Task.CompletedTask;
    }

    public Task UpdateChapterAsync(Chapter chapter, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task AddChapterVersionAsync(ChapterVersion version, CancellationToken ct = default)
    {
        ChapterVersions.Add(version);
        return Task.CompletedTask;
    }

    public Task<ChapterVersion?> GetChapterVersionAsync(Guid chapterId, int versionNo, CancellationToken ct = default)
    {
        ChapterVersion? v = ChapterVersions.FirstOrDefault(cv => cv.ChapterId == chapterId && cv.VersionNo == versionNo);
        return Task.FromResult(v);
    }

    public Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsAsync(Guid chapterId, CancellationToken ct = default)
    {
        IReadOnlyList<ChapterVersion> list = ChapterVersions.Where(cv => cv.ChapterId == chapterId)
            .OrderByDescending(cv => cv.VersionNo)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsPagedAsync(Guid chapterId, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        IReadOnlyList<ChapterVersion> list = ChapterVersions.Where(cv => cv.ChapterId == chapterId)
            .OrderByDescending(cv => cv.VersionNo)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<PublishedBlock>> GetPublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        IReadOnlyList<PublishedBlock> list = PublishedBlocks
            .Where(p => p.ChapterId == chapterId)
            .OrderBy(p => p.Position)
            .ToList();
        return Task.FromResult(list);
    }

    public Task ReplacePublishedBlocksAsync(Guid chapterId, IReadOnlyList<PublishedBlock> blocks, CancellationToken ct = default)
    {
        PublishedBlocks.RemoveAll(p => p.ChapterId == chapterId);
        PublishedBlocks.AddRange(blocks);
        return Task.CompletedTask;
    }

    public Task DeletePublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        PublishedBlocks.RemoveAll(p => p.ChapterId == chapterId);
        return Task.CompletedTask;
    }

    public Task<PublishedBlock?> GetPublishedBlockByIdAsync(Guid blockId, CancellationToken ct = default)
    {
        PublishedBlock? pb = PublishedBlocks.FirstOrDefault(p => p.BlockId == blockId);
        return Task.FromResult(pb);
    }

    public Task<IReadOnlyList<PublishedBlock>> ListPublishedBlocksAsync(Guid? courseId, Guid? chapterId, Guid? afterId, int limit, CancellationToken ct = default)
    {
        var query = from pb in PublishedBlocks
                    join c in Chapters on pb.ChapterId equals c.Id
                    where !c.IsDeleted && c.Status == ChapterStatus.Published
                    select new { pb, c };

        if (courseId.HasValue)
        {
            query = query.Where(x => x.c.CourseId == courseId.Value);
        }

        if (chapterId.HasValue)
        {
            query = query.Where(x => x.pb.ChapterId == chapterId.Value);
        }

        var list = query.OrderBy(x => x.c.Position)
                        .ThenBy(x => x.pb.Position)
                        .Select(x => x.pb)
                        .ToList();

        if (afterId.HasValue)
        {
            int index = list.FindIndex(b => b.BlockId == afterId.Value);
            if (index >= 0)
            {
                IReadOnlyList<PublishedBlock> paged = list.Skip(index + 1).Take(limit).ToList();
                return Task.FromResult(paged);
            }
        }

        IReadOnlyList<PublishedBlock> result = list.Take(limit).ToList();
        return Task.FromResult(result);
    }

    public Task<Question?> GetQuestionByIdAsync(Guid questionId, CancellationToken ct = default)
    {
        Question? q = Questions.FirstOrDefault(x => x.Id == questionId);
        return Task.FromResult(q);
    }

    public Task<IReadOnlyList<Question>> GetQuestionsByIdsAsync(IReadOnlyList<Guid> questionIds, CancellationToken ct = default)
    {
        IReadOnlyList<Question> list = Questions.Where(q => questionIds.Contains(q.Id)).ToList();
        return Task.FromResult(list);
    }

    public Task<int> CountReadyQuestionsAsync(Guid courseId, string? filterTag, byte? filterDifficultyCode, QuestionType? filterQuestionType, CancellationToken ct = default)
    {
        var query = from q in Questions
                    join b in QuestionBanks on q.BankId equals b.Id
                    where b.CourseId == courseId && q.Status == QuestionStatus.Ready
                    select q;

        if (filterDifficultyCode.HasValue)
        {
            query = query.Where(q => q.DifficultyCode == filterDifficultyCode.Value);
        }

        if (filterQuestionType.HasValue)
        {
            query = query.Where(q => q.QuestionType == filterQuestionType.Value);
        }

        if (!string.IsNullOrWhiteSpace(filterTag))
        {
            string tag = filterTag.Trim();
            query = query.Where(q => QuestionTags.Any(t => t.QuestionId == q.Id && t.Tag == tag));
        }

        return Task.FromResult(query.Count());
    }

    public Task<IReadOnlyList<Block>> GetBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        IReadOnlyList<Block> list = Blocks.Where(b => b.ChapterId == chapterId)
            .OrderBy(b => b.Position)
            .ToList();
        return Task.FromResult(list);
    }

    public Task ReplaceBlocksAsync(Guid chapterId, IReadOnlyList<Block> newBlocks, CancellationToken ct = default)
    {
        Blocks.RemoveAll(b => b.ChapterId == chapterId);
        Blocks.AddRange(newBlocks);
        return Task.CompletedTask;
    }

    public Task SaveQuizConfigAsync(
        QuizConfig config,
        IReadOnlyList<QuizQuestion>? questions,
        IReadOnlyList<QuizRandomRule>? rules,
        IReadOnlyList<QuizPrerequisite>? prerequisites,
        CancellationToken ct = default)
    {
        QuizConfigs.RemoveAll(q => q.BlockId == config.BlockId);
        QuizConfigs.Add(config);

        if (questions != null)
        {
            QuizQuestions.RemoveAll(q => q.QuizBlockId == config.BlockId);
            QuizQuestions.AddRange(questions);
        }

        if (rules != null)
        {
            QuizRandomRules.RemoveAll(r => r.QuizBlockId == config.BlockId);
            QuizRandomRules.AddRange(rules);
        }

        if (prerequisites != null)
        {
            QuizPrerequisites.RemoveAll(p => p.QuizBlockId == config.BlockId);
            QuizPrerequisites.AddRange(prerequisites);
        }

        return Task.CompletedTask;
    }

    public Task SaveAssignmentConfigAsync(AssignmentConfig config, CancellationToken ct = default)
    {
        AssignmentConfigs.RemoveAll(a => a.BlockId == config.BlockId);
        AssignmentConfigs.Add(config);
        return Task.CompletedTask;
    }

    public Task<QuizConfig?> GetQuizConfigAsync(Guid blockId, CancellationToken ct = default)
    {
        QuizConfig? config = QuizConfigs.FirstOrDefault(q => q.BlockId == blockId);
        return Task.FromResult(config);
    }

    public Task<IReadOnlyList<QuizQuestion>> GetQuizQuestionsAsync(Guid blockId, CancellationToken ct = default)
    {
        IReadOnlyList<QuizQuestion> list = QuizQuestions.Where(q => q.QuizBlockId == blockId).OrderBy(q => q.Position).ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<QuizRandomRule>> GetQuizRandomRulesAsync(Guid blockId, CancellationToken ct = default)
    {
        IReadOnlyList<QuizRandomRule> list = QuizRandomRules.Where(r => r.QuizBlockId == blockId).ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<QuizPrerequisite>> GetQuizPrerequisitesAsync(Guid blockId, CancellationToken ct = default)
    {
        IReadOnlyList<QuizPrerequisite> list = QuizPrerequisites.Where(p => p.QuizBlockId == blockId).ToList();
        return Task.FromResult(list);
    }

    public Task<AssignmentConfig?> GetAssignmentConfigAsync(Guid blockId, CancellationToken ct = default)
    {
        AssignmentConfig? config = AssignmentConfigs.FirstOrDefault(a => a.BlockId == blockId);
        return Task.FromResult(config);
    }

    public Task<Resource?> GetResourceByIdAsync(Guid resourceId, CancellationToken ct = default)
    {
        Resource? res = Resources.FirstOrDefault(r => r.Id == resourceId && !r.IsDeleted);
        return Task.FromResult(res);
    }

    public Task<IReadOnlyList<Resource>> ListResourcesByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        IReadOnlyList<Resource> list = Resources.Where(r => r.CourseId == courseId && !r.IsDeleted).ToList();
        return Task.FromResult(list);
    }

    public Task AddResourceAsync(Resource resource, CancellationToken ct = default)
    {
        Resources.Add(resource);
        return Task.CompletedTask;
    }

    public Task UpdateResourceAsync(Resource resource, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task<bool> IsResourceInUseAsync(Guid resourceId, CancellationToken ct = default)
    {
        bool inUse = Blocks.Any(b => b.ResourceId == resourceId);
        return Task.FromResult(inUse);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return Task.FromResult(1);
    }
}
