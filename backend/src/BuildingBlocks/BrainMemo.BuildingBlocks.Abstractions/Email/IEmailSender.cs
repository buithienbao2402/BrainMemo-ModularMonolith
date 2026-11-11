namespace BrainMemo.BuildingBlocks.Abstractions.Email;

public sealed record EmailMessage(
    string ToEmail,
    string Subject,
    string HtmlBody,
    string? TextBody = null,
    string? ToName = null);

/// <summary>
/// Outbound email port implemented via SMTP / Mailpit in dev (contracts/README.md §2).
/// </summary>
public interface IEmailSender
{
    Task Send(EmailMessage message, CancellationToken ct = default);
}
