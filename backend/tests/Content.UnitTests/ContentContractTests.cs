using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Content.Infrastructure.Contracts;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public sealed class ContentContractTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid CourseId = Guid.NewGuid();
    private static readonly Guid OwnerUserId = Guid.NewGuid();
    private static readonly Guid StudentUserId = Guid.NewGuid();
    private static readonly Guid StrangerUserId = Guid.NewGuid();

    private readonly FakeContentRepository _repository = new();
    private readonly FakeCourseContract _courseContract = new();
    private readonly ContentContractService _contractService;

    public ContentContractTests()
    {
        _courseContract.AddCourse(CourseId, OwnerUserId, accessMode: "PRIVATE", state: "ACTIVE");
        _courseContract.AddEnrollment(CourseId, StudentUserId);
        _contractService = new ContentContractService(_repository, _courseContract);
    }

    #region AuthorizeResourceDownload

    [Fact]
    public async Task AuthorizeResourceDownload_WhenOwner_ReturnsAuthorized()
    {
        Resource resource = new(Guid.NewGuid(), CourseId, ResourceKind.Pdf, "file.pdf", "application/pdf", 100, "key1");
        await _repository.AddResourceAsync(resource);

        Result<ResourceAuthDto> result = _contractService.AuthorizeResourceDownload(resource.Id, OwnerUserId);

        Assert.True(result.IsSuccess);
        Assert.Equal("key1", result.Value.StorageKey);
        Assert.Equal("file.pdf", result.Value.OriginalFilename);
    }

    [Fact]
    public async Task AuthorizeResourceDownload_WhenEnrolledStudent_ReturnsAuthorized()
    {
        Resource resource = new(Guid.NewGuid(), CourseId, ResourceKind.Pdf, "file.pdf", "application/pdf", 100, "key1");
        await _repository.AddResourceAsync(resource);

        Result<ResourceAuthDto> result = _contractService.AuthorizeResourceDownload(resource.Id, StudentUserId);

        Assert.True(result.IsSuccess);
        Assert.Equal("key1", result.Value.StorageKey);
    }

    [Fact]
    public async Task AuthorizeResourceDownload_WhenStrangerOnPrivateCourse_ReturnsForbidden()
    {
        Resource resource = new(Guid.NewGuid(), CourseId, ResourceKind.Pdf, "file.pdf", "application/pdf", 100, "key1");
        await _repository.AddResourceAsync(resource);

        Result<ResourceAuthDto> result = _contractService.AuthorizeResourceDownload(resource.Id, StrangerUserId);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.Forbidden, result.Error.Code);
    }

    [Fact]
    public void AuthorizeResourceDownload_WhenResourceNotFound_ReturnsNotFound()
    {
        Result<ResourceAuthDto> result = _contractService.AuthorizeResourceDownload(Guid.NewGuid(), OwnerUserId);

        Assert.True(result.IsFailure);
        Assert.Equal("RESOURCE_NOT_FOUND", result.Error.Code);
    }

    #endregion

    #region GetChapterInfo

    [Fact]
    public async Task GetChapterInfo_WhenExists_ReturnsMetadata()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương mẫu", null, 1);
        chapter.Publish(1, Now);
        await _repository.AddChapterAsync(chapter);

        Result<IReadOnlyList<ChapterInfoDto>> result = _contractService.GetChapterInfo([chapter.Id]);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value);
        Assert.Equal(chapter.Id, result.Value[0].Id);
        Assert.Equal("Chương mẫu", result.Value[0].Title);
        Assert.Equal(1, result.Value[0].Position);
        Assert.Equal(CourseId, result.Value[0].CourseId);
    }

    [Fact]
    public void GetChapterInfo_WhenNotFound_ReturnsEmptyList()
    {
        Result<IReadOnlyList<ChapterInfoDto>> result = _contractService.GetChapterInfo([Guid.NewGuid()]);

        Assert.True(result.IsSuccess);
        Assert.Empty(result.Value);
    }

    #endregion

    #region ListPublishedChapters & CountPublishedChapters

    [Fact]
    public async Task ListPublishedChapters_OnlyReturnsPublishedChaptersInOrder()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        c1.Publish(1, Now);

        Chapter c2 = new(Guid.NewGuid(), CourseId, "Chương 2 (Nháp)", null, 2); // Draft

        Chapter c3 = new(Guid.NewGuid(), CourseId, "Chương 3", null, 3);
        c3.Publish(1, Now);

        await _repository.AddChapterAsync(c1);
        await _repository.AddChapterAsync(c2);
        await _repository.AddChapterAsync(c3);

        Result<IReadOnlyList<ChapterInfoDto>> result = _contractService.ListPublishedChapters(CourseId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
        Assert.Equal("Chương 1", result.Value[0].Title);
        Assert.Equal("Chương 3", result.Value[1].Title);
    }

    [Fact]
    public async Task CountPublishedChapters_ReturnsCorrectCount()
    {
        Chapter c1 = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        c1.Publish(1, Now);

        Chapter c2 = new(Guid.NewGuid(), CourseId, "Chương 2", null, 2);
        c2.Publish(1, Now);

        await _repository.AddChapterAsync(c1);
        await _repository.AddChapterAsync(c2);

        Result<int> result = _contractService.CountPublishedChapters(CourseId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value);
    }

    #endregion
}
