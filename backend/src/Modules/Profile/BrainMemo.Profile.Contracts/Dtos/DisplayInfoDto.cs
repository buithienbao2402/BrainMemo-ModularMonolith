namespace BrainMemo.Profile.Contracts.Dtos;

public sealed record DisplayInfoDto(
    Guid UserId,
    string DisplayName,
    string? AvatarUrl);
