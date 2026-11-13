using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Xunit;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace Course.UnitTests;

public sealed class CourseDomainTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid OwnerId = Guid.NewGuid();

    [Fact]
    public void Create_WithValidParameters_ShouldSucceed()
    {
        Guid courseId = Guid.NewGuid();
        string name = "Kiến trúc Modular Monolith trong thực tế";
        string description = "Khóa học thực chiến toàn diện";
        string coverKey = "courses/cover.png";
        List<string> tags = ["dotnet", "csharp", "architecture"];

        Result<CourseEntity> result = CourseEntity.Create(
            courseId,
            OwnerId,
            name,
            description,
            coverKey,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            tags,
            Now);

        Assert.True(result.IsSuccess);
        CourseEntity course = result.Value;
        Assert.Equal(courseId, course.Id);
        Assert.Equal(OwnerId, course.OwnerUserId);
        Assert.Equal(name, course.Name);
        Assert.Equal(description, course.Description);
        Assert.Equal(coverKey, course.CoverStorageKey);
        Assert.Equal(CourseAccessMode.Public, course.AccessMode);
        Assert.Equal(CourseStatus.Updating, course.Status);
        Assert.Equal(3, course.Tags.Count);
        Assert.Equal(1u, course.Revision);
        Assert.True(course.IsEligible());
        Assert.False(course.IsHidden);
        Assert.False(course.IsDeleted);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithEmptyName_ShouldFail(string? emptyName)
    {
        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            emptyName!,
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            null,
            Now);

        Assert.True(result.IsFailure);
        Assert.Equal("COURSE_NAME_REQUIRED", result.Error.Code);
    }

    [Fact]
    public void Create_WithNameExceeding200Chars_ShouldFail()
    {
        string longName = new('A', 201);
        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            longName,
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            null,
            Now);

        Assert.True(result.IsFailure);
        Assert.Equal("COURSE_NAME_TOO_LONG", result.Error.Code);
    }

    [Fact]
    public void Create_WithMoreThan10Tags_ShouldFail()
    {
        List<string> elevenTags = Enumerable.Range(1, 11).Select(i => $"tag{i}").ToList();

        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Valid Name",
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            elevenTags,
            Now);

        Assert.True(result.IsFailure);
        Assert.Equal("COURSE_TOO_MANY_TAGS", result.Error.Code);
    }

    [Fact]
    public void Create_WithTagExceeding50Chars_ShouldFail()
    {
        List<string> tags = [new string('x', 51)];

        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Valid Name",
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            tags,
            Now);

        Assert.True(result.IsFailure);
        Assert.Equal("COURSE_TAG_TOO_LONG", result.Error.Code);
    }

    [Fact]
    public void Update_WhenHiddenAndChangingToOnlyMe_ShouldFailWithOnlyMeNotAllowed()
    {
        Result<CourseEntity> createResult = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học sắp bị ẩn",
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            ["tag1"],
            Now);

        Assert.True(createResult.IsSuccess);
        CourseEntity course = createResult.Value;

        // Admin hides course
        Guid sanctionId = Guid.NewGuid();
        Result hideResult = course.Hide(sanctionId, Now);
        Assert.True(hideResult.IsSuccess);
        Assert.True(course.IsHidden);

        // Owner attempts to switch access mode to ONLY_ME while hidden
        Result updateResult = course.Update(
            "Tên mới",
            "Mô tả mới",
            CourseAccessMode.OnlyMe,
            CourseStatus.Updating,
            ["tag1"],
            Now.AddMinutes(5));

        Assert.True(updateResult.IsFailure);
        Assert.Equal("ONLY_ME_NOT_ALLOWED", updateResult.Error.Code);
    }

    [Fact]
    public void SoftDelete_ShouldSetDeletedAtAndIncrementRevision()
    {
        Result<CourseEntity> createResult = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học cần xóa",
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            [],
            Now);

        CourseEntity course = createResult.Value;
        uint initialRevision = course.Revision;

        DateTimeOffset deleteTime = Now.AddHours(1);
        Result deleteResult = course.SoftDelete(deleteTime);

        Assert.True(deleteResult.IsSuccess);
        Assert.True(course.IsDeleted);
        Assert.Equal(deleteTime, course.DeletedAt);
        Assert.Equal(initialRevision + 1, course.Revision);
        Assert.False(course.IsEligible());
    }

    [Fact]
    public void Hide_AndRestore_WithMatchingSanctionId_ShouldSucceed()
    {
        Result<CourseEntity> createResult = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học kiểm tra ẩn/khôi phục",
            "Desc",
            null,
            CourseAccessMode.Public,
            CourseStatus.Updating,
            [],
            Now);

        CourseEntity course = createResult.Value;
        Guid sanctionId = Guid.NewGuid();

        // 1. Hide
        Result hideResult = course.Hide(sanctionId, Now);
        Assert.True(hideResult.IsSuccess);
        Assert.True(course.IsHidden);
        Assert.Equal(sanctionId, course.HiddenSanctionId);
        Assert.False(course.IsEligible());

        // 2. Restore with mismatched sanctionId -> should fail
        Result mismatchRestore = course.Restore(Guid.NewGuid(), Now.AddMinutes(10));
        Assert.True(mismatchRestore.IsFailure);
        Assert.Equal("SANCTION_MISMATCH", mismatchRestore.Error.Code);
        Assert.True(course.IsHidden);

        // 3. Restore with matching sanctionId -> should succeed
        Result correctRestore = course.Restore(sanctionId, Now.AddMinutes(15));
        Assert.True(correctRestore.IsSuccess);
        Assert.False(course.IsHidden);
        Assert.Null(course.HiddenSanctionId);
        Assert.True(course.IsEligible());
    }

    [Fact]
    public void Hide_WhenAccessModeIsOnlyMe_ShouldFailWithOnlyMeNotAllowed()
    {
        Result<CourseEntity> createResult = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Khóa học cá nhân",
            "Desc",
            null,
            CourseAccessMode.OnlyMe,
            CourseStatus.Updating,
            [],
            Now);

        CourseEntity course = createResult.Value;
        Result hideResult = course.Hide(Guid.NewGuid(), Now);

        Assert.True(hideResult.IsFailure);
        Assert.Equal("ONLY_ME_NOT_ALLOWED", hideResult.Error.Code);
    }
}
