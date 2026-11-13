using BrainMemo.Profile.Domain.Entities;
using BrainMemo.Profile.Domain.Enums;
using BrainMemo.Profile.Domain.Services;
using BrainMemo.SharedKernel.Results;
using Xunit;

namespace Profile.UnitTests.Domain;

public sealed class ProfileDomainTests
{
    [Fact]
    public void ProfileDisplayNameGenerator_ShouldProduceDeterministic6HexSuffix()
    {
        Guid userId = Guid.Parse("01932371-2cb0-705b-8664-98444a50d241");

        string name1 = ProfileDisplayNameGenerator.GenerateDefault(userId);
        string name2 = ProfileDisplayNameGenerator.GenerateDefault(userId);

        Assert.Equal(name1, name2);
        Assert.StartsWith("Người dùng ", name1);
        Assert.Equal("50D241", name1["Người dùng ".Length..]);
    }

    [Fact]
    public void CreateDefault_WithEmptyGuid_ShouldFail()
    {
        Result<UserProfile> result = UserProfile.CreateDefault(Guid.Empty, DateTimeOffset.UtcNow);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, result.Error.Code);
    }

    [Fact]
    public void CreateDefault_WithValidGuid_ShouldInitializeDefaultValues()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset now = DateTimeOffset.UtcNow;

        Result<UserProfile> result = UserProfile.CreateDefault(userId, now);

        Assert.True(result.IsSuccess);
        UserProfile profile = result.Value;
        Assert.Equal(userId, profile.UserId);
        Assert.StartsWith("Người dùng ", profile.DisplayName);
        Assert.Null(profile.AvatarStorageKey);
        Assert.Null(profile.Bio);
        Assert.True(profile.ShowCourseList);
        Assert.Equal(UiTheme.Light, profile.UiTheme);
        Assert.Equal(now, profile.CreatedAt);
        Assert.Equal(now, profile.UpdatedAt);
    }

    [Fact]
    public void Create_WithInvalidDisplayName_ShouldFail()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset now = DateTimeOffset.UtcNow;

        Result<UserProfile> emptyResult = UserProfile.Create(userId, "   ", null, null, true, UiTheme.Light, now);
        Result<UserProfile> longResult = UserProfile.Create(userId, new string('a', 101), null, null, true, UiTheme.Light, now);

        Assert.True(emptyResult.IsFailure);
        Assert.True(longResult.IsFailure);
    }

    [Fact]
    public void Update_ShouldModifyPropertiesAndUpdatedAt()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset created = DateTimeOffset.UtcNow.AddHours(-1);
        DateTimeOffset updated = DateTimeOffset.UtcNow;

        UserProfile profile = UserProfile.CreateDefault(userId, created).Value;

        Result updateResult = profile.Update(
            "  Nguyễn Văn A  ",
            "Mô tả ngắn",
            showCourseList: false,
            UiTheme.Dark,
            updated);

        Assert.True(updateResult.IsSuccess);
        Assert.Equal("Nguyễn Văn A", profile.DisplayName);
        Assert.Equal("Mô tả ngắn", profile.Bio);
        Assert.False(profile.ShowCourseList);
        Assert.Equal(UiTheme.Dark, profile.UiTheme);
        Assert.Equal(updated, profile.UpdatedAt);
    }

    [Fact]
    public void UpdateAvatar_ShouldUpdateStorageKeyAndTimestamp()
    {
        Guid userId = Guid.NewGuid();
        DateTimeOffset now = DateTimeOffset.UtcNow;
        UserProfile profile = UserProfile.CreateDefault(userId, now).Value;

        profile.UpdateAvatar("avatars/u1/abc.png", now.AddMinutes(5));

        Assert.Equal("avatars/u1/abc.png", profile.AvatarStorageKey);
        Assert.Equal(now.AddMinutes(5), profile.UpdatedAt);
    }
}
