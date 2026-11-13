using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Password change payload matching <c>POST /auth/change-password</c> in <c>openapi/modules/identity.yaml</c>.
/// </summary>
public sealed record ChangePasswordRequest
{
    [Required(ErrorMessage = "Mật khẩu hiện tại không được để trống.")]
    public string? CurrentPassword { get; init; }

    [Required(ErrorMessage = "Mật khẩu mới không được để trống.")]
    public string? NewPassword { get; init; }
}
