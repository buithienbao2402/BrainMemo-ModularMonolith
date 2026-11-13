using BrainMemo.Profile.Domain.Enums;
using BrainMemo.Profile.Domain.Services;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Profile.Domain.Entities;

public sealed class UserProfile : Entity<Guid>
{
    public const int MaxDisplayNameLength = 100;
    public const int MaxBioLength = 2000;
    public const int MaxAvatarStorageKeyLength = 500;

    private UserProfile(
        Guid userId,
        string displayName,
        string? avatarStorageKey,
        string? bio,
        bool showCourseList,
        UiTheme uiTheme,
        DateTimeOffset createdAt,
        DateTimeOffset updatedAt)
        : base(userId)
    {
        DisplayName = displayName;
        AvatarStorageKey = avatarStorageKey;
        Bio = bio;
        ShowCourseList = showCourseList;
        UiTheme = uiTheme;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }

    // Required for EF Core
    private UserProfile() : base(Guid.Empty)
    {
        DisplayName = string.Empty;
    }

    public Guid UserId => Id;

    public string DisplayName { get; private set; }

    public string? AvatarStorageKey { get; private set; }

    public string? Bio { get; private set; }

    public bool ShowCourseList { get; private set; }

    public UiTheme UiTheme { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset UpdatedAt { get; private set; }

    public static Result<UserProfile> CreateDefault(Guid userId, DateTimeOffset utcNow)
    {
        if (userId == Guid.Empty)
        {
            return Error.Validation("UserId không hợp lệ.");
        }

        string defaultDisplayName = ProfileDisplayNameGenerator.GenerateDefault(userId);
        return new UserProfile(
            userId,
            defaultDisplayName,
            avatarStorageKey: null,
            bio: null,
            showCourseList: true,
            uiTheme: UiTheme.Light,
            createdAt: utcNow,
            updatedAt: utcNow);
    }

    public static Result<UserProfile> Create(
        Guid userId,
        string displayName,
        string? avatarStorageKey,
        string? bio,
        bool showCourseList,
        UiTheme uiTheme,
        DateTimeOffset utcNow)
    {
        if (userId == Guid.Empty)
        {
            return Error.Validation("UserId không hợp lệ.");
        }

        string trimmedName = displayName?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(trimmedName))
        {
            return Error.Validation("Tên hiển thị không được để trống.");
        }

        if (trimmedName.Length > MaxDisplayNameLength)
        {
            return Error.Validation($"Tên hiển thị không được vượt quá {MaxDisplayNameLength} ký tự.");
        }

        if (bio is not null && bio.Length > MaxBioLength)
        {
            return Error.Validation($"Giới thiệu không được vượt quá {MaxBioLength} ký tự.");
        }

        if (avatarStorageKey is not null && avatarStorageKey.Length > MaxAvatarStorageKeyLength)
        {
            return Error.Validation($"Khóa tệp đại diện không được vượt quá {MaxAvatarStorageKeyLength} ký tự.");
        }

        return new UserProfile(
            userId,
            trimmedName,
            avatarStorageKey,
            bio,
            showCourseList,
            uiTheme,
            createdAt: utcNow,
            updatedAt: utcNow);
    }

    public Result Update(
        string displayName,
        string? bio,
        bool showCourseList,
        UiTheme uiTheme,
        DateTimeOffset utcNow)
    {
        string trimmedName = displayName?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(trimmedName))
        {
            return Error.Validation("Tên hiển thị không được để trống.");
        }

        if (trimmedName.Length > MaxDisplayNameLength)
        {
            return Error.Validation($"Tên hiển thị không được vượt quá {MaxDisplayNameLength} ký tự.");
        }

        if (bio is not null && bio.Length > MaxBioLength)
        {
            return Error.Validation($"Giới thiệu không được vượt quá {MaxBioLength} ký tự.");
        }

        DisplayName = trimmedName;
        Bio = bio;
        ShowCourseList = showCourseList;
        UiTheme = uiTheme;
        UpdatedAt = utcNow;

        return Result.Success();
    }

    public void UpdateAvatar(string? avatarStorageKey, DateTimeOffset utcNow)
    {
        AvatarStorageKey = avatarStorageKey;
        UpdatedAt = utcNow;
    }
}
