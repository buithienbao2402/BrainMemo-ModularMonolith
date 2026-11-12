namespace BrainMemo.Identity.Domain.Enums;

/// <summary>
/// Canonical lock state stored in <c>idn_user.account_status</c>.
/// </summary>
public enum AccountStatus
{
    Active = 0,
    LockedTemporary = 1,
    LockedPermanent = 2,
}

public static class AccountStatusExtensions
{
    public const string ActiveDbValue = "ACTIVE";
    public const string LockedTemporaryDbValue = "LOCKED_TEMPORARY";
    public const string LockedPermanentDbValue = "LOCKED_PERMANENT";

    public static string ToDatabaseValue(this AccountStatus status) => status switch
    {
        AccountStatus.Active => ActiveDbValue,
        AccountStatus.LockedTemporary => LockedTemporaryDbValue,
        AccountStatus.LockedPermanent => LockedPermanentDbValue,
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null),
    };

    public static AccountStatus ParseAccountStatus(string value) => value switch
    {
        ActiveDbValue => AccountStatus.Active,
        LockedTemporaryDbValue => AccountStatus.LockedTemporary,
        LockedPermanentDbValue => AccountStatus.LockedPermanent,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown account status."),
    };
}

