namespace BrainMemo.Identity.Application.Auth.Models;

/// <summary>
/// Authenticated user snapshot returned alongside issued tokens.
/// </summary>
public sealed record CurrentUserDto(
    Guid Id,
    string Email,
    bool EmailVerified,
    bool IsAdmin,
    string AccountStatus);
