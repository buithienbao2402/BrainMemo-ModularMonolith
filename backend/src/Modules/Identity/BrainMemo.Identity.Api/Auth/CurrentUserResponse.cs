namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Current user schema matching openapi/modules/identity.yaml #/components/schemas/CurrentUser.
/// </summary>
public sealed record CurrentUserResponse(
    Guid Id,
    string Email,
    bool EmailVerified,
    bool IsAdmin,
    string AccountStatus);
