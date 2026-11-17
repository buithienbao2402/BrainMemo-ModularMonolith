using System.ComponentModel.DataAnnotations;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Google login request payload matching <c>openapi/modules/identity.yaml</c> (FR-IDN-06).
/// </summary>
public sealed record GoogleAuthRequest
{
    [Required(ErrorMessage = "IdToken không được để trống.")]
    public string? IdToken { get; init; }
}
