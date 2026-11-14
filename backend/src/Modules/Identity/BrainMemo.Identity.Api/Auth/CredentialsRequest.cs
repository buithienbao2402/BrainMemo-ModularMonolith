using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Email and password request payload matching <c>CredentialsRequest</c> in <c>openapi/modules/identity.yaml</c>.
/// </summary>
public sealed record CredentialsRequest
{
    [Required(ErrorMessage = "Email không được để trống.")]
    public string? Email { get; init; }

    [Required(ErrorMessage = "Mật khẩu không được để trống.")]
    public string? Password { get; init; }

    public string? DisplayName { get; init; }
}
