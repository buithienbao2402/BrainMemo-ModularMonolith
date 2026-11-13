using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Content.Application.Commands.CreateResource;
using BrainMemo.Content.Application.Commands.DeleteResource;
using BrainMemo.Content.Application.Queries.GetResourceDownloadUrl;
using BrainMemo.Content.Application.Queries.ListResources;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public sealed class ResourceManagementTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid CourseId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    private readonly FakeContentRepository _repository = new();
    private readonly FakeCourseContract _courseContract = new();
    private readonly FakeFileStorage _fileStorage = new();
    private readonly FakeSystemClock _clock = new(Now);

    public ResourceManagementTests()
    {
        _courseContract.AddCourse(CourseId, OwnerUserId, accessMode: "PUBLIC", state: "ACTIVE");
    }

    #region CreateResource & Size/MIME Limits (DEC-05)

    [Fact]
    public async Task CreateResource_ImageUnder5MB_SucceedsAndCommitsKey()
    {
        string tmpKey = $"tmp/{OwnerUserId:D}/{Guid.NewGuid():D}.png";
        long fiveMB = 5 * 1024 * 1024; // 5,242,880 bytes
        _fileStorage.SetFileHead(tmpKey, new FileHead(fiveMB, "image/png", "etag-img"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OwnerUserId, tmpKey, "diagram.png");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("diagram.png", result.Value.OriginalFilename);
        Assert.Equal("IMAGE", result.Value.Kind);
        Assert.Equal(fiveMB, result.Value.SizeBytes);

        // Verify committed file storage key pattern courses/{courseId}/resources/{id}.png
        Assert.Single(_fileStorage.CommittedKeys);
        (string src, string dest) = _fileStorage.CommittedKeys[0];
        Assert.Equal(tmpKey, src);
        Assert.StartsWith($"courses/{CourseId}/resources/", dest);
        Assert.EndsWith(".png", dest);

        Resource? resourceInDb = await _repository.GetResourceByIdAsync(result.Value.Id);
        Assert.NotNull(resourceInDb);
        Assert.Equal(dest, resourceInDb.StorageKey);
    }

    [Fact]
    public async Task CreateResource_ImageOver5MB_FailsWithSizeLimitError()
    {
        string tmpKey = $"tmp/{OwnerUserId:D}/{Guid.NewGuid():D}.jpg";
        long overLimit = 5 * 1024 * 1024 + 1; // 5 MB + 1 byte
        _fileStorage.SetFileHead(tmpKey, new FileHead(overLimit, "image/jpeg", "etag-img-large"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OwnerUserId, tmpKey, "photo_large.jpg");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTooLarge, result.Error.Code);
        Assert.Empty(_fileStorage.CommittedKeys);
    }

    [Fact]
    public async Task CreateResource_DocumentUnder20MB_Succeeds()
    {
        string tmpKey = $"tmp/{OwnerUserId:D}/{Guid.NewGuid():D}.pdf";
        long twentyMB = 20 * 1024 * 1024; // 20,971,520 bytes
        _fileStorage.SetFileHead(tmpKey, new FileHead(twentyMB, "application/pdf", "etag-pdf"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OwnerUserId, tmpKey, "course_syllabus.pdf");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("course_syllabus.pdf", result.Value.OriginalFilename);
        Assert.Equal("PDF", result.Value.Kind);
        Assert.Equal(twentyMB, result.Value.SizeBytes);
    }

    [Fact]
    public async Task CreateResource_DocumentOver20MB_FailsWithSizeLimitError()
    {
        string tmpKey = $"tmp/{OwnerUserId:D}/{Guid.NewGuid():D}.pdf";
        long overLimit = 20 * 1024 * 1024 + 1; // 20 MB + 1 byte
        _fileStorage.SetFileHead(tmpKey, new FileHead(overLimit, "application/pdf", "etag-pdf-large"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OwnerUserId, tmpKey, "huge_manual.pdf");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTooLarge, result.Error.Code);
        Assert.Empty(_fileStorage.CommittedKeys);
    }

    [Fact]
    public async Task CreateResource_DisallowedExtension_FailsWithFileTypeNotAllowed()
    {
        string tmpKey = $"tmp/{OwnerUserId:D}/{Guid.NewGuid():D}.exe";
        _fileStorage.SetFileHead(tmpKey, new FileHead(1024, "application/x-msdownload", "etag-exe"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OwnerUserId, tmpKey, "installer.exe");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.FileTypeNotAllowed, result.Error.Code);
    }

    [Fact]
    public async Task CreateResource_WhenNotOwner_ReturnsForbidden()
    {
        string tmpKey = $"tmp/{OtherUserId:D}/{Guid.NewGuid():D}.png";
        _fileStorage.SetFileHead(tmpKey, new FileHead(1024, "image/png", "etag-png"));

        CreateResourceCommandHandler handler = new(_repository, _courseContract, _fileStorage);
        CreateResourceCommand command = new(CourseId, OtherUserId, tmpKey, "diagram.png");

        Result<ResourceDto> result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    #endregion

    #region DeleteResource & Conflict In-Use (FR-CNT-18)

    [Fact]
    public async Task DeleteResource_WhenNotInUse_SoftDeletesResource()
    {
        Resource resource = new(
            Guid.NewGuid(),
            CourseId,
            ResourceKind.Image,
            "res1.png",
            "image/png",
            1024,
            "courses/res1.png");

        await _repository.AddResourceAsync(resource);

        DeleteResourceCommandHandler handler = new(_repository, _courseContract);
        DeleteResourceCommand command = new(CourseId, resource.Id, OwnerUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(resource.IsDeleted);
        Assert.NotNull(resource.DeletedAt);
    }

    [Fact]
    public async Task DeleteResource_WhenInUseByBlock_ReturnsResourceInUse409()
    {
        Resource resource = new(
            Guid.NewGuid(),
            CourseId,
            ResourceKind.Image,
            "res1.png",
            "image/png",
            1024,
            "courses/res1.png");

        await _repository.AddResourceAsync(resource);

        // Add a block that uses this resource
        Guid chapterId = Guid.NewGuid();
        Block block = new(
            Guid.NewGuid(),
            chapterId,
            BlockType.Image,
            1,
            title: null,
            body: null,
            resourceId: resource.Id);

        await _repository.ReplaceBlocksAsync(chapterId, [block]);

        DeleteResourceCommandHandler handler = new(_repository, _courseContract);
        DeleteResourceCommand command = new(CourseId, resource.Id, OwnerUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ResourceInUse, result.Error.Code);
        Assert.False(resource.IsDeleted);
    }

    [Fact]
    public async Task DeleteResource_WhenNotOwner_ReturnsForbidden()
    {
        Resource resource = new(
            Guid.NewGuid(),
            CourseId,
            ResourceKind.Image,
            "res1.png",
            "image/png",
            1024,
            "courses/res1.png");

        await _repository.AddResourceAsync(resource);

        DeleteResourceCommandHandler handler = new(_repository, _courseContract);
        DeleteResourceCommand command = new(CourseId, resource.Id, OtherUserId);

        Result result = await handler.Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
        Assert.False(resource.IsDeleted);
    }

    #endregion

    #region ListResources & GetDownloadUrl (DEC-06)

    [Fact]
    public async Task ListResources_WhenOwner_ReturnsCourseResources()
    {
        Resource r1 = new(Guid.NewGuid(), CourseId, ResourceKind.Image, "f1.png", "image/png", 100, "k1");
        Resource r2 = new(Guid.NewGuid(), CourseId, ResourceKind.Pdf, "f2.pdf", "application/pdf", 200, "k2");
        await _repository.AddResourceAsync(r1);
        await _repository.AddResourceAsync(r2);

        ListResourcesQueryHandler handler = new(_repository, _courseContract);
        ListResourcesQuery query = new(CourseId, OwnerUserId);

        Result<IReadOnlyList<ResourceDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
    }

    [Fact]
    public async Task ListResources_WhenNotOwner_ReturnsForbidden()
    {
        ListResourcesQueryHandler handler = new(_repository, _courseContract);
        ListResourcesQuery query = new(CourseId, OtherUserId);

        Result<IReadOnlyList<ResourceDto>> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public async Task GetResourceDownloadUrl_GeneratesPresignedUrlWith15MinTtl()
    {
        Resource resource = new(
            Guid.NewGuid(),
            CourseId,
            ResourceKind.Pdf,
            "file.pdf",
            "application/pdf",
            1024,
            "courses/final/file.pdf");

        await _repository.AddResourceAsync(resource);

        GetResourceDownloadUrlQueryHandler handler = new(_repository, _courseContract, _fileStorage, _clock);
        GetResourceDownloadUrlQuery query = new(CourseId, resource.Id, OwnerUserId);

        Result<ResourceDownloadUrlDto> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Contains("courses/final/file.pdf", result.Value.Url);
        // TTL 15 minutes = 900 seconds
        Assert.Contains("ttl=900", result.Value.Url);
        Assert.Equal(Now.AddMinutes(15), result.Value.ExpiresAt);
    }

    [Fact]
    public async Task GetResourceDownloadUrl_WhenAccessDenied_ReturnsForbidden()
    {
        Guid privateCourseId = Guid.NewGuid();
        _courseContract.AddCourse(privateCourseId, OwnerUserId, accessMode: "PRIVATE", state: "ACTIVE");

        Resource resource = new(
            Guid.NewGuid(),
            privateCourseId,
            ResourceKind.Pdf,
            "secret.pdf",
            "application/pdf",
            1024,
            "courses/final/secret.pdf");

        await _repository.AddResourceAsync(resource);

        GetResourceDownloadUrlQueryHandler handler = new(_repository, _courseContract, _fileStorage, _clock);
        GetResourceDownloadUrlQuery query = new(privateCourseId, resource.Id, OtherUserId);

        Result<ResourceDownloadUrlDto> result = await handler.Handle(query, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    #endregion
}
