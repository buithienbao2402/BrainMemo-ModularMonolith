using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Content.UnitTests;

public sealed class ContentDomainTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid CourseId = Guid.NewGuid();

    [Fact]
    public void Chapter_Create_InitializesCorrectState()
    {
        Result<Chapter> result = Chapter.Create(CourseId, "Chương 1", "Mô tả", 1);

        Assert.True(result.IsSuccess);
        Chapter chapter = result.Value;
        Assert.NotEqual(Guid.Empty, chapter.Id);
        Assert.Equal(CourseId, chapter.CourseId);
        Assert.Equal(1, chapter.Position);
        Assert.Equal("Chương 1", chapter.Title);
        Assert.Equal("Mô tả", chapter.Description);
        Assert.Equal(ChapterStatus.Draft, chapter.Status);
        Assert.Equal(1, chapter.LastVersionNo);
        Assert.Null(chapter.PublishedVersionNo);
        Assert.False(chapter.IsDeleted);
    }

    [Fact]
    public void Chapter_UpdateDetails_UpdatesFields()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);

        Result result = chapter.UpdateDetails("Chương 1 sửa đổi", "Mô tả mới");

        Assert.True(result.IsSuccess);
        Assert.Equal("Chương 1 sửa đổi", chapter.Title);
        Assert.Equal("Mô tả mới", chapter.Description);
    }

    [Fact]
    public void Chapter_IncrementVersion_IncrementsLastVersionNo()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);
        Assert.Equal(1, chapter.LastVersionNo);

        chapter.IncrementVersion();

        Assert.Equal(2, chapter.LastVersionNo);
    }

    [Fact]
    public void Chapter_Publish_SetsPublishedVersionAndStatus()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);

        Result result = chapter.Publish(1, Now.AddMinutes(10));

        Assert.True(result.IsSuccess);
        Assert.Equal(ChapterStatus.Published, chapter.Status);
        Assert.Equal(1, chapter.PublishedVersionNo);
    }

    [Fact]
    public void Chapter_SoftDelete_SetsDeletedFlag()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);

        chapter.SoftDelete();

        Assert.True(chapter.IsDeleted);
        Assert.NotNull(chapter.DeletedAt);
    }

    [Fact]
    public void Chapter_Reorder_SetsNewPosition()
    {
        Chapter chapter = new(Guid.NewGuid(), CourseId, "Chương 1", null, 1);

        chapter.Reorder(5);

        Assert.Equal(5, chapter.Position);
    }

    [Fact]
    public void Resource_Create_ValidatesProperties()
    {
        Result<Resource> result = Resource.Create(
            CourseId,
            ResourceKind.Image,
            "res.png",
            "image/png",
            5000,
            "courses/res.png");

        Assert.True(result.IsSuccess);
        Resource res = result.Value;
        Assert.NotEqual(Guid.Empty, res.Id);
        Assert.Equal("res.png", res.OriginalFilename);
        Assert.Equal("image/png", res.ContentType);
        Assert.Equal(5000, res.SizeBytes);
        Assert.False(res.IsDeleted);
    }

    [Fact]
    public void Resource_SoftDelete_MarksDeleted()
    {
        Resource res = new(
            Guid.NewGuid(),
            CourseId,
            ResourceKind.Pdf,
            "f.pdf",
            "application/pdf",
            100,
            "key");

        res.SoftDelete();

        Assert.True(res.IsDeleted);
        Assert.NotNull(res.DeletedAt);
    }

    [Fact]
    public void Block_Constructor_SetsProperties()
    {
        Guid id = Guid.NewGuid();
        Guid chapterId = Guid.NewGuid();

        Block block = new(
            id,
            chapterId,
            BlockType.RichText,
            1,
            title: "Tiêu đề",
            body: "<p>Nội dung</p>");

        Assert.Equal(id, block.Id);
        Assert.Equal(chapterId, block.ChapterId);
        Assert.Equal(BlockType.RichText, block.BlockType);
        Assert.Equal(1, block.Position);
        Assert.Equal("Tiêu đề", block.Title);
        Assert.Equal("<p>Nội dung</p>", block.Body);
    }
}
