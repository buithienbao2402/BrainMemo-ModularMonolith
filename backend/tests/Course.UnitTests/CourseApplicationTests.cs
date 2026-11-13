using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Commands.CreateCourse;
using BrainMemo.Course.Application.Commands.DeleteCourse;
using BrainMemo.Course.Application.Commands.UpdateCourse;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Application.Queries.GetCourse;
using BrainMemo.Course.Application.Queries.ListProfileCourses;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Course.Infrastructure.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;
using CourseStatus = BrainMemo.Course.Domain.Enums.CourseStatus;
using ChapterAccessMode = BrainMemo.Course.Domain.Enums.ChapterAccessMode;

namespace Course.UnitTests;

public sealed class CourseApplicationTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid OwnerId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    #region D18 Acceptance Criteria Tests

    [Theory]
    [InlineData(CourseAccessMode.Private, false, false)]
    [InlineData(CourseAccessMode.OnlyMe, false, false)]
    [InlineData(CourseAccessMode.Public, true, false)]  // Hidden
    [InlineData(CourseAccessMode.Public, false, true)]  // Deleted
    [InlineData(CourseAccessMode.Private, true, false)] // Hidden
    [InlineData(CourseAccessMode.Private, false, true)] // Deleted
    public void CourseEventFactory_WhenCourseNotEligible_PayloadMustBeCompletelyEmpty(
        CourseAccessMode accessMode,
        bool isHidden,
        bool isDeleted)
    {
        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học nhạy cảm hoặc riêng tư",
            "Mô tả chi tiết không được lộ",
            "courses/cover.png",
            accessMode,
            CourseStatus.Updating,
            ["tag1", "tag2"],
            Now);

        CourseEntity course = result.Value;
        if (isHidden)
        {
            course.Hide(Guid.NewGuid(), Now);
        }

        if (isDeleted)
        {
            course.SoftDelete(Now);
        }

        Assert.False(course.IsEligible());

        CourseUpserted @event = CourseEventFactory.CreateUpsertedEvent(course, Now);

        // CRITICAL CRITERION D18: When Eligible is false, NO content fields allowed!
        Assert.False(@event.Eligible);
        Assert.Equal(course.Id, @event.CourseId);
        Assert.Equal(course.Revision, @event.Revision);
        Assert.Null(@event.Name);
        Assert.Null(@event.Description);
        Assert.Null(@event.AccessMode);
        Assert.Null(@event.Status);
        Assert.Null(@event.Tags);
        Assert.Null(@event.OwnerUserId);
    }

    [Fact]
    public void CourseEventFactory_WhenCourseEligible_PayloadMustContainFullSnapshot()
    {
        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học công khai mẫu",
            "Mô tả công khai",
            "courses/cover.png",
            CourseAccessMode.Public,
            CourseStatus.Updating,
            ["react", "dotnet"],
            Now);

        CourseEntity course = result.Value;
        Assert.True(course.IsEligible());

        CourseUpserted @event = CourseEventFactory.CreateUpsertedEvent(course, Now);

        Assert.True(@event.Eligible);
        Assert.Equal(course.Id, @event.CourseId);
        Assert.Equal(course.Revision, @event.Revision);
        Assert.Equal("Khóa học công khai mẫu", @event.Name);
        Assert.Equal("Mô tả công khai", @event.Description);
        Assert.Equal("PUBLIC", @event.AccessMode);
        Assert.Equal("UPDATING", @event.Status);
        Assert.Equal(2, @event.Tags?.Count);
        Assert.Equal(OwnerId, @event.OwnerUserId);
    }

    #endregion

    #region CreateCourse Command Tests

    [Fact]
    public async Task CreateCourse_WhenEmailNotVerified_ReturnsEmailNotVerifiedError()
    {
        FakeIdentityContract fakeIdentity = new(isEmailVerified: false);
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);

        CreateCourseCommandHandler handler = new(fakeRepo, fakeIdentity, null, fakeOutbox, fakeClock);

        CreateCourseCommand command = new(
            OwnerUserId: OwnerId,
            Name: "Khóa học thử nghiệm",
            Description: "Mô tả",
            AccessMode: CourseAccessMode.Public,
            Status: CourseStatus.Updating,
            Tags: ["tag1"],
            CoverUploadKey: null);

        Result<CourseDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("EMAIL_NOT_VERIFIED", result.Error.Code);
        Assert.Empty(fakeRepo.Courses);
        Assert.Empty(fakeOutbox.EnqueuedMessages);
    }

    [Fact]
    public async Task CreateCourse_WithCoverExceeding5MB_ReturnsValidationError()
    {
        FakeIdentityContract fakeIdentity = new(isEmailVerified: true);
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);
        FakeFileStorage fakeStorage = new();
        string uploadKey = $"tmp/{OwnerId:D}/{Guid.NewGuid():D}.png";
        fakeStorage.AddHead(uploadKey, new FileHead(6L * 1024L * 1024L, "image/png"));

        CreateCourseCommandHandler handler = new(fakeRepo, fakeIdentity, null, fakeOutbox, fakeClock, fakeStorage);

        CreateCourseCommand command = new(
            OwnerUserId: OwnerId,
            Name: "Khóa học ảnh quá lớn",
            Description: "Mô tả",
            AccessMode: CourseAccessMode.Public,
            Status: CourseStatus.Updating,
            Tags: ["tag1"],
            CoverUploadKey: uploadKey);

        Result<CourseDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(fakeRepo.Courses);
    }

    [Fact]
    public async Task CreateCourse_WhenValid_PersistsCourseAndEnqueuesOutbox()
    {
        FakeIdentityContract fakeIdentity = new(isEmailVerified: true, email: "teacher@brainmemo.vn");
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);
        FakeFileStorage fakeStorage = new();
        string uploadKey = $"tmp/{OwnerId:D}/{Guid.NewGuid():D}.png";
        fakeStorage.AddHead(uploadKey, new FileHead(2L * 1024L * 1024L, "image/png"));

        CreateCourseCommandHandler handler = new(fakeRepo, fakeIdentity, null, fakeOutbox, fakeClock, fakeStorage);

        CreateCourseCommand command = new(
            OwnerUserId: OwnerId,
            Name: "Lập trình C# nâng cao",
            Description: "Mô tả khóa",
            AccessMode: CourseAccessMode.Public,
            Status: CourseStatus.Updating,
            Tags: ["csharp", "dotnet"],
            CoverUploadKey: uploadKey);

        Result<CourseDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(fakeRepo.Courses);
        Assert.Single(fakeOutbox.EnqueuedMessages);

        CourseDto dto = result.Value;
        Assert.Equal("Lập trình C# nâng cao", dto.Name);
        Assert.Equal("PUBLIC", dto.AccessMode);
        Assert.True(dto.Viewer.IsOwner);
        Assert.True(dto.Viewer.CanReadContent);
        Assert.True(dto.Viewer.CanLearn);
        Assert.NotNull(dto.CoverUrl);
    }

    #endregion

    #region Update & Delete Command Tests

    [Fact]
    public async Task UpdateCourse_WhenChangingToOnlyMeWhileHidden_ReturnsOnlyMeNotAllowed()
    {
        FakeIdentityContract fakeIdentity = new(isEmailVerified: true);
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);

        CourseEntity course = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học sắp bị ẩn",
            "Mô tả",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            [],
            Now).Value;

        course.Hide(Guid.NewGuid(), Now);
        fakeRepo.Courses.Add(course);

        UpdateCourseCommandHandler handler = new(fakeRepo, null, fakeOutbox, fakeClock);

        UpdateCourseCommand command = new(
            CourseId: course.Id,
            CurrentUserId: OwnerId,
            Name: "Tên mới",
            Description: null,
            AccessMode: CourseAccessMode.OnlyMe,
            Status: null,
            Tags: null,
            CoverUploadKey: null,
            RemoveCover: null);

        Result<CourseDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal("ONLY_ME_NOT_ALLOWED", result.Error.Code);
    }

    [Fact]
    public async Task DeleteCourse_WhenOwner_SoftDeletesAndEnqueuesOutboxWithEmptyPayload()
    {
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);

        CourseEntity course = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa cần xóa",
            "Mô tả",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            ["tag1"],
            Now).Value;

        fakeRepo.Courses.Add(course);

        DeleteCourseCommandHandler handler = new(fakeRepo, fakeOutbox, fakeClock);
        DeleteCourseCommand command = new(course.Id, OwnerId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(course.IsDeleted);
        Assert.Single(fakeOutbox.EnqueuedMessages);

        CourseUpserted @event = (CourseUpserted)fakeOutbox.EnqueuedMessages[0];
        Assert.False(@event.Eligible);
        Assert.Null(@event.Name); // D18 rule
    }

    #endregion

    #region Query & Contract Tests

    [Theory]
    [InlineData(CourseAccessMode.OnlyMe, false, false)]
    [InlineData(CourseAccessMode.Public, true, false)]  // Hidden
    [InlineData(CourseAccessMode.Public, false, true)]  // Soft deleted
    public async Task GetCourse_ForNonOwner_HidesExistenceWith404(
        CourseAccessMode accessMode,
        bool isHidden,
        bool isDeleted)
    {
        FakeIdentityContract fakeIdentity = new(isEmailVerified: true);
        FakeCourseRepository fakeRepo = new();

        CourseEntity course = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học bí mật",
            "Mô tả",
            null,
            accessMode,
            CourseStatus.Updating,
            [],
            Now).Value;

        if (isHidden) course.Hide(Guid.NewGuid(), Now);
        if (isDeleted) course.SoftDelete(Now);
        fakeRepo.Courses.Add(course);

        GetCourseQueryHandler handler = new(fakeRepo, null);
        GetCourseQuery query = new(course.Id, OtherUserId);

        Result<CourseDto> result = await handler.Handle(query, CancellationToken.None);

        // DEC-16: 404 hides existence
        Assert.True(result.IsFailure);
        Assert.Equal("COURSE_NOT_FOUND", result.Error.Code);
    }

    [Fact]
    public async Task ListProfileCourses_WhenProfileHidesCourseList_ReturnsEmptyForNonOwner()
    {
        FakeCourseRepository fakeRepo = new();
        FakeProfileContract fakeProfile = new(showCourseList: false);

        CourseEntity publicCourse = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa công khai của user ẩn danh sách",
            "Mô tả",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            [],
            Now).Value;

        fakeRepo.Courses.Add(publicCourse);

        ListProfileCoursesQueryHandler handler = new(fakeRepo, fakeProfile);
        ListProfileCoursesQuery query = new(OwnerId, OtherUserId, 1, 12);

        Result<PagedResult<CourseCardDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value.Items);
        Assert.Equal(0, result.Value.TotalItems);
    }

    [Fact]
    public void CourseContractService_ResolveReportTarget_OnlyMeCourse_ReturnsNotFound()
    {
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);

        CourseEntity course = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa Only Me",
            "Mô tả",
            null,
            CourseAccessMode.OnlyMe,
            CourseStatus.Updating,
            [],
            Now).Value;

        fakeRepo.Courses.Add(course);

        CourseContractService service = new(fakeRepo, fakeOutbox, fakeClock);
        Result<ReportTargetDto> result = service.ResolveReportTarget(course.Id, OtherUserId);

        Assert.True(result.IsFailure);
        Assert.Equal("NOT_FOUND", result.Error.Code);
    }

    [Fact]
    public void CourseContractService_PermanentlyDeleteCourse_ActiveCourse_ReturnsInvalidState()
    {
        FakeCourseRepository fakeRepo = new();
        FakeOutboxWriter fakeOutbox = new();
        FakeClock fakeClock = new(Now);

        CourseEntity course = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa đang hoạt động bình thường",
            "Mô tả",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            [],
            Now).Value;

        fakeRepo.Courses.Add(course);

        CourseContractService service = new(fakeRepo, fakeOutbox, fakeClock);
        Result<string> result = service.PermanentlyDeleteCourse(course.Id, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal("INVALID_STATE", result.Error.Code);
    }

    #endregion

    #region Fakes

    private sealed class FakeIdentityContract(bool isEmailVerified, string email = "test@brainmemo.vn") : IIdentityContract
    {
        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default)
        {
            AccountStatusDto status = new(
                Status: "Active",
                LockedUntil: null,
                LockReason: null,
                EmailVerified: isEmailVerified);

            return Task.FromResult(Result.Success(status));
        }

        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(false));
        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) => Task.FromResult(Result.Success(false));

        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            IReadOnlyList<UserSummaryDto> list = userIds.Select(id => new UserSummaryDto(id, "Active", Now, email)).ToList();
            return Task.FromResult(Result.Success(list));
        }

        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Result.Success(Page<Guid>.Empty()));

        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) =>
            Task.FromResult(Result.Success<Guid?>(null));

        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success());

        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) =>
            Task.FromResult(Result.Success());
    }

    private sealed class FakeProfileContract(bool showCourseList = true) : IProfileContract
    {
        public Task<Result<PublicProfileDto>> GetPublicProfile(Guid userId, CancellationToken ct = default)
        {
            PublicProfileDto profile = new(
                UserId: userId,
                DisplayName: "Nguyễn Văn Test",
                AvatarUrl: null,
                Bio: "Bio",
                JoinedAt: Now,
                ShowCourseList: showCourseList);

            return Task.FromResult(Result.Success(profile));
        }

        public Task<Result<IReadOnlyList<DisplayInfoDto>>> GetDisplayInfo(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            IReadOnlyList<DisplayInfoDto> list = userIds.Select(id => new DisplayInfoDto(id, "Nguyễn Văn Test", null)).ToList();
            return Task.FromResult(Result.Success(list));
        }
    }

    private sealed class FakeFileStorage : IFileStorage
    {
        private readonly Dictionary<string, FileHead> _heads = [];

        public void AddHead(string key, FileHead head) => _heads[key] = head;

        public Task<PresignedUpload> CreateUploadUrl(string tmpKey, string contentType, long maxBytes, TimeSpan ttl, CancellationToken ct = default) =>
            Task.FromResult(new PresignedUpload(tmpKey, $"https://storage.local/{tmpKey}", Now.Add(ttl)));

        public Task<FileHead?> Head(string key, CancellationToken ct = default) =>
            Task.FromResult(_heads.TryGetValue(key, out FileHead? head) ? head : null);

        public Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default) => Task.FromResult(finalKey);

        public Task<string> CreateDownloadUrl(string key, TimeSpan ttl, string? downloadName = null, CancellationToken ct = default) =>
            Task.FromResult($"https://storage.local/presigned/{key}");

        public Task Delete(string key, CancellationToken ct = default) => Task.CompletedTask;
        public Task DeleteByPrefix(string prefix, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeOutboxWriter : IOutboxWriter
    {
        public List<IntegrationEvent> EnqueuedMessages { get; } = [];

        public Task WriteAsync(string moduleName, Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            EnqueuedMessages.Add(@event);
            return Task.CompletedTask;
        }

        public Task WriteAsync(Guid aggregateId, IntegrationEvent @event, CancellationToken ct = default)
        {
            EnqueuedMessages.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow => now;
    }

    private sealed class FakeCourseRepository : ICourseRepository
    {
        public List<CourseEntity> Courses { get; } = [];
        public List<Enrollment> Enrollments { get; } = [];
        public List<ChapterAccess> ChapterAccesses { get; } = [];
        public List<ChapterUnlock> ChapterUnlocks { get; } = [];
        public List<Nomination> Nominations { get; } = [];

        public Task AddAsync(CourseEntity course, CancellationToken ct = default)
        {
            Courses.Add(course);
            return Task.CompletedTask;
        }

        public Task<CourseEntity?> GetByIdAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Courses.FirstOrDefault(c => c.Id == courseId));

        public Task<CourseEntity?> GetByIdWithTagsAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(Courses.FirstOrDefault(c => c.Id == courseId));

        public Task<IReadOnlyList<CourseEntity>> GetSummariesAsync(IReadOnlyList<Guid> courseIds, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<CourseEntity>>(Courses.Where(c => courseIds.Contains(c.Id)).ToList());

        public Task<Enrollment?> GetEnrollmentAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Enrollments.FirstOrDefault(e => e.CourseId == courseId && e.UserId == userId));

        public Task<ChapterAccess?> GetChapterAccessAsync(Guid chapterId, CancellationToken ct = default) =>
            Task.FromResult(ChapterAccesses.FirstOrDefault(a => a.ChapterId == chapterId));

        public Task<ChapterUnlock?> GetChapterUnlockAsync(Guid chapterId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(ChapterUnlocks.FirstOrDefault(u => u.ChapterId == chapterId && u.UserId == userId));

        public Task<bool> HasNominatedAsync(Guid courseId, Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Nominations.Any(n => n.CourseId == courseId && n.UserId == userId && n.WithdrawnAt == null));

        public Task<CourseStatsDto> GetCourseStatsAsync(Guid courseId, CancellationToken ct = default) =>
            Task.FromResult(new CourseStatsDto(0, 0, 0, 0, 0, 0));

        public Task<int> GetLearnerCountAsync(Guid courseId, CancellationToken ct = default) => Task.FromResult(0);
        public Task<int> GetNominationCountAsync(Guid courseId, CancellationToken ct = default) => Task.FromResult(0);

        public Task<Page<CourseEntity>> ListUserCoursesAsync(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(new Page<CourseEntity>(Courses, null, false));

        public Task<PagedResult<CourseEntity>> ListProfileCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default)
        {
            List<CourseEntity> items = Courses.Where(c => c.OwnerUserId == userId && c.AccessMode == CourseAccessMode.Public && !c.IsHidden && !c.IsDeleted).ToList();
            return Task.FromResult(new PagedResult<CourseEntity>(items, page, pageSize, items.Count));
        }

        public Task<PagedResult<CourseEntity>> ListMyOwnedCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default)
        {
            List<CourseEntity> items = Courses.Where(c => c.OwnerUserId == userId && !c.IsDeleted).ToList();
            return Task.FromResult(new PagedResult<CourseEntity>(items, page, pageSize, items.Count));
        }

        public Task<PagedResult<CourseEntity>> ListMyEnrolledCoursesPagedAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) =>
            Task.FromResult(new PagedResult<CourseEntity>([], page, pageSize, 0));

        public Task<Page<Guid>> ListActiveLearnerIdsAsync(Guid courseId, Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<Guid>.Empty());

        public Task<Page<CourseSnapshotDto>> ListCourseSnapshotsAsync(Guid? afterId, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<CourseSnapshotDto>.Empty());

        public Task<Page<EnrollmentFactDto>> ListEnrollmentFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<EnrollmentFactDto>.Empty());

        public Task<Page<NominationFactDto>> ListNominationFactsAsync(DateTimeOffset? after, int limit, CancellationToken ct = default) =>
            Task.FromResult(Page<NominationFactDto>.Empty());

        public Task DeletePermanentlyAsync(CourseEntity course, CancellationToken ct = default)
        {
            Courses.Remove(course);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct = default) => Task.CompletedTask;
    }

    #endregion
}
