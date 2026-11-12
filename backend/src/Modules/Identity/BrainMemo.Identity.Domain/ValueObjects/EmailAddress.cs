using System.Net.Mail;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.ValueObjects;

/// <summary>
/// Normalized lowercase email address constrained to <c>idn_user.email</c> (max 255 chars).
/// </summary>
public sealed class EmailAddress : ValueObject
{
    public const int MaxLength = 255;

    private EmailAddress(string value)
    {
        Value = value;
    }

    public string Value { get; }

    public static Result<EmailAddress> Create(string? rawEmail)
    {
        if (string.IsNullOrWhiteSpace(rawEmail))
        {
            return Error.Validation("Email không được để trống.");
        }

        string normalized = Normalize(rawEmail);
        if (normalized.Length > MaxLength)
        {
            return Error.Validation($"Email không được vượt quá {MaxLength} ký tự.");
        }

        if (!IsValidEmailFormat(normalized))
        {
            return Error.Validation("Định dạng email không hợp lệ.");
        }

        return Result.Success(new EmailAddress(normalized));
    }

    public static string Normalize(string rawEmail)
    {
        ArgumentNullException.ThrowIfNull(rawEmail);
        return rawEmail.Trim().ToLowerInvariant();
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    private static bool IsValidEmailFormat(string normalized)
    {
        if (normalized.Any(char.IsWhiteSpace) || normalized.Any(char.IsControl))
        {
            return false;
        }

        int atIndex = normalized.IndexOf('@', StringComparison.Ordinal);
        if (atIndex <= 0 || atIndex != normalized.LastIndexOf('@') || atIndex == normalized.Length - 1)
        {
            return false;
        }

        string host = normalized[(atIndex + 1)..];
        if (!host.Contains('.', StringComparison.Ordinal)
            || host.StartsWith('.')
            || host.EndsWith('.')
            || host.Contains("..", StringComparison.Ordinal))
        {
            return false;
        }

        if (!MailAddress.TryCreate(normalized, out MailAddress? parsed))
        {
            return false;
        }

        return string.Equals(parsed.Address, normalized, StringComparison.Ordinal);
    }
}

