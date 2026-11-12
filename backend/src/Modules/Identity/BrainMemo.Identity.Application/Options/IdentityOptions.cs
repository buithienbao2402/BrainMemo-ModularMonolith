namespace BrainMemo.Identity.Application.Options;

/// <summary>
/// Configurable lifetime settings for Identity one-time verification and password-reset tokens.
/// </summary>
public sealed class IdentityOptions
{
    public const string SectionName = "Identity";

    public TimeSpan EmailVerificationTokenTtl { get; set; } = TimeSpan.FromHours(24);

    public TimeSpan PasswordResetTokenTtl { get; set; } = TimeSpan.FromHours(1);
}
