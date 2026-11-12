using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Password reset execution payload matching <c>POST /auth/reset-password</c> in <c>openapi/modules/identity.yaml</c>.
/// </summary>
public sealed record ResetPasswordRequest
{
    [Required(ErrorMessage = "Token không được để trống.")]
    public string? Token { get; init; }

    [Required(ErrorMessage = "Mật khẩu mới không được để trống.")]
    public string? NewPassword { get; init; }
}
