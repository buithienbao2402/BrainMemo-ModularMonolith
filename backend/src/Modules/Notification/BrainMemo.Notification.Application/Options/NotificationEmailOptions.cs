namespace BrainMemo.Notification.Application.Options;

public sealed class NotificationEmailOptions
{
    public const string SectionName = "NotificationEmail";

    public string WebBaseUrl { get; set; } = "http://localhost:3000";

    public string VerifyEmailPath { get; set; } = "/verify-email";

    public string ResetPasswordPath { get; set; } = "/reset-password";
}
