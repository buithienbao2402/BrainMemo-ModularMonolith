namespace BrainMemo.Notification.Infrastructure.Email;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 1025;

    public bool UseSsl { get; set; } = false;

    public string From { get; set; } = "noreply@brainmemo.local";

    public string FromName { get; set; } = "BrainMemo LMS";

    public string? Username { get; set; }

    public string? Password { get; set; }
}
