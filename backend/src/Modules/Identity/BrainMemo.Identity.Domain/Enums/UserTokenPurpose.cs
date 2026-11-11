namespace BrainMemo.Identity.Domain.Enums;

/// <summary>
/// One-time user token purpose in <c>idn_user_token.purpose</c>.
/// </summary>
public enum UserTokenPurpose
{
    VerifyEmail = 0,
    ResetPassword = 1,
}

public static class UserTokenPurposeExtensions
{
    public const string VerifyEmailDbValue = "VERIFY_EMAIL";
    public const string ResetPasswordDbValue = "RESET_PASSWORD";

    public static string ToDatabaseValue(this UserTokenPurpose purpose) => purpose switch
    {
        UserTokenPurpose.VerifyEmail => VerifyEmailDbValue,
        UserTokenPurpose.ResetPassword => ResetPasswordDbValue,
        _ => throw new ArgumentOutOfRangeException(nameof(purpose), purpose, null),
    };

    public static UserTokenPurpose ParseUserTokenPurpose(string value) => value switch
    {
        VerifyEmailDbValue => UserTokenPurpose.VerifyEmail,
        ResetPasswordDbValue => UserTokenPurpose.ResetPassword,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown user token purpose."),
    };
}

