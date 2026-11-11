namespace BrainMemo.Identity.Domain.Enums;

/// <summary>
/// Reason a refresh session was revoked in <c>idn_refresh_session.revoke_reason</c>.
/// </summary>
public enum SessionRevokeReason
{
    Logout = 0,
    UserRevoked = 1,
    LogoutAll = 2,
    AccountLocked = 3,
}

public static class SessionRevokeReasonExtensions
{
    public const string LogoutDbValue = "LOGOUT";
    public const string UserRevokedDbValue = "USER_REVOKED";
    public const string LogoutAllDbValue = "LOGOUT_ALL";
    public const string AccountLockedDbValue = "ACCOUNT_LOCKED";

    public static string ToDatabaseValue(this SessionRevokeReason reason) => reason switch
    {
        SessionRevokeReason.Logout => LogoutDbValue,
        SessionRevokeReason.UserRevoked => UserRevokedDbValue,
        SessionRevokeReason.LogoutAll => LogoutAllDbValue,
        SessionRevokeReason.AccountLocked => AccountLockedDbValue,
        _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, null),
    };

    public static SessionRevokeReason ParseSessionRevokeReason(string value) => value switch
    {
        LogoutDbValue => SessionRevokeReason.Logout,
        UserRevokedDbValue => SessionRevokeReason.UserRevoked,
        LogoutAllDbValue => SessionRevokeReason.LogoutAll,
        AccountLockedDbValue => SessionRevokeReason.AccountLocked,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown session revoke reason."),
    };
}

