using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.Entities;

/// <summary>
/// External OAuth link owned by <see cref="User"/> (<c>idn_external_identity</c>).
/// </summary>
public sealed class ExternalIdentity : Entity
{
    public const int MaxProviderSubjectLength = 255;

    private ExternalIdentity()
    {
    }

    private ExternalIdentity(
        Guid id,
        Guid userId,
        ExternalProvider provider,
        string providerSubject,
        DateTimeOffset createdAt)
        : base(id)
    {
        UserId = userId;
        Provider = provider;
        ProviderSubject = providerSubject;
        CreatedAt = createdAt;
    }

    public Guid UserId { get; private set; }

    public ExternalProvider Provider { get; private set; }

    public string ProviderSubject { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    internal static Result<ExternalIdentity> Create(
        Guid id,
        Guid userId,
        ExternalProvider provider,
        string providerSubject,
        DateTimeOffset utcNow)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID liên kết OAuth không hợp lệ.");
        }

        if (userId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(providerSubject))
        {
            return Error.Validation("Provider subject không được để trống.");
        }

        string normalizedSubject = providerSubject.Trim();
        if (normalizedSubject.Length > MaxProviderSubjectLength)
        {
            return Error.Validation($"Provider subject không được vượt quá {MaxProviderSubjectLength} ký tự.");
        }

        return Result.Success(new ExternalIdentity(
            id,
            userId,
            provider,
            normalizedSubject,
            utcNow));
    }
}

