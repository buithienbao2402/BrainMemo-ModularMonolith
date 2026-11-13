namespace BrainMemo.Profile.Contracts.Dtos;

public sealed record PublicProfileDto(
    Guid UserId,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    DateTimeOffset JoinedAt,
    bool ShowCourseList);
