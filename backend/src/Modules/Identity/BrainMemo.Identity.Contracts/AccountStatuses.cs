namespace BrainMemo.Identity.Contracts;

/// <summary>
/// Canonical string representations of Identity account status (db/schema.sql & openapi/modules/identity.yaml).
/// </summary>
public static class AccountStatuses
{
    public const string Active = "ACTIVE";
    public const string LockedTemporary = "LOCKED_TEMPORARY";
    public const string LockedPermanent = "LOCKED_PERMANENT";
}

