namespace BrainMemo.Profile.Application.DTOs;

public sealed record ProfileDto(
    Guid UserId,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    bool ShowCourseList,
    string UiTheme,
    DateTimeOffset JoinedAt);
