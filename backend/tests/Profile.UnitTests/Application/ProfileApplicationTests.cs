using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Identity.Contracts;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Application.Commands.UpdateMyProfile;
using BrainMemo.Profile.Application.DTOs;
using BrainMemo.Profile.Application.EventHandlers;
using BrainMemo.Profile.Application.Queries.GetMyProfile;
using BrainMemo.Profile.Application.Queries.GetPublicProfile;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.Profile.Contracts.Events;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.Profile.Domain.Enums;
using BrainMemo.Profile.Infrastructure.Contracts;
using BrainMemo.SharedKernel.Events;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Profile.UnitTests.Application;

public sealed class ProfileApplicationTests
{
    private sealed class InMemoryProfileRepository : IProfileRepository
    {
        private readonly Dictionary<Guid, UserProfile> _store = [];

        public Task<UserProfile?> FindByUserIdAsync(Guid userId, CancellationToken ct = default)
        {
            _store.TryGetValue(userId, out UserProfile? profile);
            return Task.FromResult(profile);
        }

        public Task<IReadOnlyList<UserProfile>> FindByUserIdsAsync(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            List<UserProfile> result = _store.Values.Where(p => userIds.Contains(p.UserId)).ToList();
            return Task.FromResult<IReadOnlyList<UserProfile>>(result);
        }

        public Task<Result> AddAsync(UserProfile profile, CancellationToken ct = default)
        {
            if (_store.ContainsKey(profile.UserId))
            {
                return Task.FromResult<Result>(Error.Conflict("EXISTS", "Already exists"));
            }

            _store[profile.UserId] = profile;
            return Task.FromResult(Result.Success());
        }

        public Task<Result> UpdateAsync(UserProfile profile, CancellationToken ct = default)
        {
            _store[profile.UserId] = profile;
            return Task.FromResult(Result.Success());
        }
    }

    private sealed class FakeIdentityContract : IIdentityContract
    {
        public Dictionary<Guid, UserSummaryDto> Users { get; } = [];

        public Task<Result<AccountStatusDto>> GetAccountStatus(Guid userId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result<bool>> IsAdmin(Guid userId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result<bool>> IsLastAdmin(Guid userId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result<IReadOnlyList<UserSummaryDto>>> GetUserSummary(IReadOnlyList<Guid> userIds, CancellationToken ct = default)
        {
            List<UserSummaryDto> list = [];
            foreach (Guid id in userIds)
            {
                if (Users.TryGetValue(id, out UserSummaryDto? dto))
                {
                    list.Add(dto);
                }
            }

            return Task.FromResult<Result<IReadOnlyList<UserSummaryDto>>>(list);
        }

        public Task<Result<Page<Guid>>> ListActiveUserIds(Guid? afterId, int limit, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result<Guid?>> FindUserIdByEmail(string email, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result> LockAccount(Guid userId, LockType type, DateTimeOffset? until, string reason, Guid sanctionId, Guid actorAdminId, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<Result> UnlockAccount(Guid userId, string reason, Guid actorAdminId, CancellationToken ct = default) =>
            throw new NotImplementedException();
    }

    private sealed class FakeEventBus : IEventBus
    {
        public List<IntegrationEvent> PublishedEvents { get; } = [];

        public Task Publish(IntegrationEvent @event, CancellationToken ct = default)
        {
            PublishedEvents.Add(@event);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeClock(DateTimeOffset utcNow) : IClock
    {
        public DateTimeOffset UtcNow { get; set; } = utcNow;
    }

    private sealed class FakeFileStorage : IFileStorage
    {
        public Dictionary<string, FileHead> Files { get; } = [];
        public List<string> CommittedFiles { get; } = [];
        public List<(string Key, TimeSpan Ttl)> RequestedDownloadUrls { get; } = [];

        public Task<PresignedUpload> CreateUploadUrl(string tmpKey, string contentType, long maxBytes, TimeSpan ttl, CancellationToken ct = default) =>
            throw new NotImplementedException();

        public Task<FileHead?> Head(string key, CancellationToken ct = default)
        {
            Files.TryGetValue(key, out FileHead? head);
            return Task.FromResult(head);
        }

        public Task<string> Commit(string tmpKey, string finalKey, CancellationToken ct = default)
        {
            CommittedFiles.Add(finalKey);
            return Task.FromResult(finalKey);
        }

        public Task<string> CreateDownloadUrl(string key, TimeSpan ttl, string? downloadName = null, CancellationToken ct = default)
        {
            RequestedDownloadUrls.Add((key, ttl));
            return Task.FromResult($"https://cdn.brainmemo.local/{key}?token=signature");
        }

        public Task Delete(string key, CancellationToken ct = default) => Task.CompletedTask;

        public Task DeleteByPrefix(string prefix, CancellationToken ct = default) => Task.CompletedTask;
    }

    [Fact]
    public async Task UserRegisteredHandler_ShouldCreateDefaultProfileIdempotently()
    {
        InMemoryProfileRepository repo = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        UserRegisteredEventHandler handler = new(repo, clock, NullLogger<UserRegisteredEventHandler>.Instance);

        Guid userId = Guid.NewGuid();
        UserRegistered evt = new(Guid.NewGuid(), clock.UtcNow, userId);

        // First handle
        await handler.HandleAsync(evt, CancellationToken.None);
        UserProfile? profile1 = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(profile1);
        Assert.StartsWith("Người dùng ", profile1.DisplayName);

        // Second handle (idempotent)
        await handler.HandleAsync(evt, CancellationToken.None);
        UserProfile? profile2 = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(profile2);
        Assert.Equal(profile1.DisplayName, profile2.DisplayName);
    }

    [Fact]
    public async Task GetMyProfileQueryHandler_WithExistingProfile_ShouldReturnDto()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        DateTimeOffset joined = clock.UtcNow.AddDays(-10);
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, joined, "test@brainmemo.vn");

        UserProfile profile = UserProfile.CreateDefault(userId, joined).Value;
        profile.UpdateAvatar("avatars/u1/pic.png", joined);
        await repo.AddAsync(profile);

        GetMyProfileQueryHandler handler = new(repo, identity, clock, storage, NullLogger<GetMyProfileQueryHandler>.Instance);

        Result<ProfileDto> result = await handler.Handle(new GetMyProfileQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value.UserId);
        Assert.Equal(profile.DisplayName, result.Value.DisplayName);
        Assert.Equal(joined, result.Value.JoinedAt);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Contains(storage.RequestedDownloadUrls, u => u.Key == "avatars/u1/pic.png" && u.Ttl == TimeSpan.FromHours(1));
    }

    [Fact]
    public async Task GetMyProfileQueryHandler_WithMissingProfile_ShouldSelfHeal()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        DateTimeOffset joined = clock.UtcNow.AddDays(-5);
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, joined, "heal@brainmemo.vn");

        GetMyProfileQueryHandler handler = new(repo, identity, clock, null, NullLogger<GetMyProfileQueryHandler>.Instance);

        Result<ProfileDto> result = await handler.Handle(new GetMyProfileQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value.UserId);
        Assert.StartsWith("Người dùng ", result.Value.DisplayName);

        UserProfile? inDb = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(inDb);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_ShouldUpdateFieldsAndPublishEvent()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "update@brainmemo.vn");
        UserProfile initial = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(initial);

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, null, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "Bùi Thiện Bảo",
            "Software engineer",
            false,
            "DARK",
            null,
            null);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Bùi Thiện Bảo", result.Value.DisplayName);
        Assert.Equal("Software engineer", result.Value.Bio);
        Assert.False(result.Value.ShowCourseList);
        Assert.Equal("DARK", result.Value.UiTheme);

        Assert.Single(bus.PublishedEvents);
        ProfileUpdated evt = Assert.IsType<ProfileUpdated>(bus.PublishedEvents[0]);
        Assert.Equal(userId, evt.UserId);
        Assert.Equal("Bùi Thiện Bảo", evt.DisplayName);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithValidAvatarUploadKey_ShouldCommitFileAndGeneratePresignedUrl()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "avatar@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(profile);

        string uploadKey = $"tmp/{userId:D}/my-avatar.png";
        storage.Files[uploadKey] = new FileHead(1024 * 1024, "image/png"); // 1 MB

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, storage, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "Người dùng Avatar",
            "Bio avatar",
            true,
            "LIGHT",
            uploadKey,
            false);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.Single(storage.CommittedFiles);

        string committedKey = storage.CommittedFiles[0];
        Assert.StartsWith($"avatars/{userId:D}/", committedKey);
        Assert.EndsWith(".png", committedKey);

        UserProfile? updated = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(updated);
        Assert.Equal(committedKey, updated.AvatarStorageKey);

        Assert.Single(bus.PublishedEvents);
        ProfileUpdated evt = Assert.IsType<ProfileUpdated>(bus.PublishedEvents[0]);
        Assert.Equal(userId, evt.UserId);
        Assert.Equal(committedKey, evt.AvatarStorageKey);

        // Verify presigned URL TTL is 1 hour per DEC-06
        Assert.Contains(storage.RequestedDownloadUrls, u => u.Key == committedKey && u.Ttl == TimeSpan.FromHours(1));
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithFileTooLarge_ShouldFailWithFileTooLargeError()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "avatar@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(profile);

        string uploadKey = $"tmp/{userId:D}/huge-avatar.jpg";
        long oversizedBytes = (5L * 1024L * 1024L) + 100L; // > 5 MB
        storage.Files[uploadKey] = new FileHead(oversizedBytes, "image/jpeg");

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, storage, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "User Name",
            null,
            true,
            "LIGHT",
            uploadKey,
            false);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTooLarge, result.Error.Code);
        Assert.Empty(storage.CommittedFiles);
        Assert.Empty(bus.PublishedEvents);

        UserProfile? notUpdated = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(notUpdated);
        Assert.Null(notUpdated.AvatarStorageKey);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithInvalidFileExtension_ShouldFailWithFileTypeNotAllowedError()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "avatar@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(profile);

        string uploadKey = $"tmp/{userId:D}/script.sh";
        storage.Files[uploadKey] = new FileHead(1024, "application/x-sh");

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, storage, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "User Name",
            null,
            true,
            "LIGHT",
            uploadKey,
            false);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTypeNotAllowed, result.Error.Code);
        Assert.Empty(storage.CommittedFiles);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithMismatchedUserIdInUploadKey_ShouldFailWithForbidden()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        Guid otherUserId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "avatar@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(profile);

        string uploadKey = $"tmp/{otherUserId:D}/stolen-avatar.png";
        storage.Files[uploadKey] = new FileHead(1024, "image/png");

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, storage, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "User Name",
            null,
            true,
            "LIGHT",
            uploadKey,
            false);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
        Assert.Empty(storage.CommittedFiles);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithFileNotFoundInStorage_ShouldFailWithNotFound()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "avatar@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        await repo.AddAsync(profile);

        string uploadKey = $"tmp/{userId:D}/nonexistent.png";
        // Do not add to storage.Files -> Head returns null

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, storage, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "User Name",
            null,
            true,
            "LIGHT",
            uploadKey,
            false);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, result.Error.Code);
        Assert.Empty(storage.CommittedFiles);
    }

    [Fact]
    public async Task UpdateMyProfileCommandHandler_WithRemoveAvatar_ShouldClearAvatarStorageKey()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeEventBus bus = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, clock.UtcNow, "remove@brainmemo.vn");
        UserProfile profile = UserProfile.CreateDefault(userId, clock.UtcNow).Value;
        profile.UpdateAvatar($"avatars/{userId:D}/existing.png", clock.UtcNow);
        await repo.AddAsync(profile);

        UpdateMyProfileCommandHandler handler = new(repo, identity, bus, clock, null, NullLogger<UpdateMyProfileCommandHandler>.Instance);

        UpdateMyProfileCommand command = new(
            userId,
            "User Name",
            null,
            true,
            "LIGHT",
            null,
            RemoveAvatar: true);

        Result<ProfileDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.AvatarUrl);

        UserProfile? updated = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(updated);
        Assert.Null(updated.AvatarStorageKey);

        Assert.Single(bus.PublishedEvents);
        ProfileUpdated evt = Assert.IsType<ProfileUpdated>(bus.PublishedEvents[0]);
        Assert.Equal(userId, evt.UserId);
        Assert.Null(evt.AvatarStorageKey);
    }

    [Fact]
    public async Task GetPublicProfileQueryHandler_WithExistingProfile_ShouldReturnPublicDto()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);
        FakeFileStorage storage = new();

        Guid userId = Guid.NewGuid();
        DateTimeOffset joined = clock.UtcNow.AddDays(-30);
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, joined, "pub@brainmemo.vn");

        UserProfile profile = UserProfile.CreateDefault(userId, joined).Value;
        profile.Update("Hồ sơ công khai", "Bio test", true, UiTheme.Light, joined);
        profile.UpdateAvatar("avatars/pub/avatar.png", joined);
        await repo.AddAsync(profile);

        ProfileContractService contract = new(repo, identity, storage, clock, NullLogger<ProfileContractService>.Instance);
        GetPublicProfileQueryHandler handler = new(contract);

        Result<PublicProfileDto> result = await handler.Handle(new GetPublicProfileQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value.UserId);
        Assert.Equal("Hồ sơ công khai", result.Value.DisplayName);
        Assert.Equal("Bio test", result.Value.Bio);
        Assert.Equal(joined, result.Value.JoinedAt);
        Assert.NotNull(result.Value.AvatarUrl);
        Assert.True(result.Value.ShowCourseList);
        Assert.Contains(storage.RequestedDownloadUrls, u => u.Key == "avatars/pub/avatar.png" && u.Ttl == TimeSpan.FromHours(1));
    }

    [Fact]
    public async Task GetPublicProfileQueryHandler_WithMissingProfile_ShouldSelfHealIfUserExistsInIdentity()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        DateTimeOffset joined = clock.UtcNow.AddDays(-14);
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, joined, "pubheal@brainmemo.vn");

        ProfileContractService contract = new(repo, identity, null, clock, NullLogger<ProfileContractService>.Instance);
        GetPublicProfileQueryHandler handler = new(contract);

        Result<PublicProfileDto> result = await handler.Handle(new GetPublicProfileQuery(userId), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value.UserId);
        Assert.StartsWith("Người dùng ", result.Value.DisplayName);
        Assert.Equal(joined, result.Value.JoinedAt);
        Assert.True(result.Value.ShowCourseList);

        UserProfile? saved = await repo.FindByUserIdAsync(userId);
        Assert.NotNull(saved);
        Assert.Equal(result.Value.DisplayName, saved.DisplayName);
    }

    [Fact]
    public async Task GetPublicProfileQueryHandler_WhenUserDoesNotExist_ShouldReturnNotFound()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid nonExistentUserId = Guid.NewGuid();

        ProfileContractService contract = new(repo, identity, null, clock, NullLogger<ProfileContractService>.Instance);
        GetPublicProfileQueryHandler handler = new(contract);

        Result<PublicProfileDto> result = await handler.Handle(new GetPublicProfileQuery(nonExistentUserId), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.NotFound, result.Error.Code);

        UserProfile? notCreated = await repo.FindByUserIdAsync(nonExistentUserId);
        Assert.Null(notCreated);
    }

    [Fact]
    public async Task ProfileContractService_GetPublicProfile_ShouldSelfHealAndReturnDto()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeFileStorage storage = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid userId = Guid.NewGuid();
        DateTimeOffset joined = clock.UtcNow.AddDays(-20);
        identity.Users[userId] = new UserSummaryDto(userId, AccountStatuses.Active, joined, "contractpub@brainmemo.vn");

        ProfileContractService contract = new(repo, identity, storage, clock, NullLogger<ProfileContractService>.Instance);

        Result<PublicProfileDto> result = await contract.GetPublicProfile(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, result.Value.UserId);
        Assert.StartsWith("Người dùng ", result.Value.DisplayName);
        Assert.Equal(joined, result.Value.JoinedAt);
    }

    [Fact]
    public async Task ProfileContractService_GetDisplayInfo_ShouldBatchLookupUsers()
    {
        InMemoryProfileRepository repo = new();
        FakeIdentityContract identity = new();
        FakeFileStorage storage = new();
        FakeClock clock = new(DateTimeOffset.UtcNow);

        Guid u1 = Guid.NewGuid();
        Guid u2 = Guid.NewGuid();

        UserProfile p1 = UserProfile.Create(u1, "User One", "avatars/u1.png", null, true, UiTheme.Light, clock.UtcNow).Value;
        UserProfile p2 = UserProfile.Create(u2, "User Two", null, null, true, UiTheme.Light, clock.UtcNow).Value;
        await repo.AddAsync(p1);
        await repo.AddAsync(p2);

        ProfileContractService contract = new(repo, identity, storage, clock, NullLogger<ProfileContractService>.Instance);

        Result<IReadOnlyList<DisplayInfoDto>> result = await contract.GetDisplayInfo([u1, u2]);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
        Assert.Contains(result.Value, x => x.UserId == u1 && x.AvatarUrl != null);
        Assert.Contains(result.Value, x => x.UserId == u2 && x.AvatarUrl == null);
        Assert.Contains(storage.RequestedDownloadUrls, u => u.Key == "avatars/u1.png" && u.Ttl == TimeSpan.FromHours(1));
    }
}
