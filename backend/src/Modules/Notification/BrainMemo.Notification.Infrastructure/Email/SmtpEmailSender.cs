using System.Net;
using System.Net.Mail;
using BrainMemo.BuildingBlocks.Abstractions.Email;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BrainMemo.Notification.Infrastructure.Email;

public sealed class SmtpEmailSender(
    IOptions<SmtpOptions> options,
    ILogger<SmtpEmailSender>? logger = null) : IEmailSender
{
    public async Task Send(EmailMessage message, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(message);

        SmtpOptions smtp = options.Value;

        using SmtpClient client = new(smtp.Host, smtp.Port);
        client.EnableSsl = smtp.UseSsl;

        if (!string.IsNullOrWhiteSpace(smtp.Username) && !string.IsNullOrWhiteSpace(smtp.Password))
        {
            client.Credentials = new NetworkCredential(smtp.Username, smtp.Password);
        }

        MailAddress fromAddress = new(smtp.From, smtp.FromName);
        MailAddress toAddress = string.IsNullOrWhiteSpace(message.ToName)
            ? new MailAddress(message.ToEmail)
            : new MailAddress(message.ToEmail, message.ToName);

        using MailMessage mailMessage = new(fromAddress, toAddress)
        {
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true,
        };

        if (!string.IsNullOrWhiteSpace(message.TextBody))
        {
            AlternateView plainView = AlternateView.CreateAlternateViewFromString(message.TextBody, null, "text/plain");
            mailMessage.AlternateViews.Add(plainView);
        }

        logger?.LogInformation(
            "Sending email via SMTP {Host}:{Port} to {ToEmail} with subject '{Subject}'",
            smtp.Host,
            smtp.Port,
            message.ToEmail,
            message.Subject);

        await client.SendMailAsync(mailMessage, ct).ConfigureAwait(false);
    }
}
