using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Password reset request payload matching <c>POST /auth/forgot-password</c> in <c>openapi/modules/identity.yaml</c>.
/// </summary>
public sealed record ForgotPasswordRequest
{
    [Required(ErrorMessage = "Email không được để trống.")]
    public string? Email { get; init; }
}
