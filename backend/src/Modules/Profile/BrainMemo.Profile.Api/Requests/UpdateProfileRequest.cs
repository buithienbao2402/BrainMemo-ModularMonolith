namespace BrainMemo.Profile.Api.Requests;

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? Bio,
    bool? ShowCourseList,
    string? UiTheme,
    string? AvatarUploadKey,
    bool? RemoveAvatar);
