using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Profile.Application.DTOs;

namespace BrainMemo.Profile.Application.Commands.UpdateMyProfile;

public sealed record UpdateMyProfileCommand(
    Guid UserId,
    string DisplayName,
    string? Bio,
    bool ShowCourseList,
    string UiTheme,
    string? AvatarUploadKey,
    bool? RemoveAvatar) : ICommand<ProfileDto>;
