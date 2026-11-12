using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Email verification token request payload matching <c>verifyEmail</c> in <c>openapi/modules/identity.yaml</c>.
/// </summary>
public sealed record VerifyEmailRequest
{
    [Required(ErrorMessage = "Token xác minh email không được để trống.")]
    public string? Token { get; init; }
}
