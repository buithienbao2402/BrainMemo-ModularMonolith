namespace BrainMemo.Identity.Contracts;

/// <summary>
/// Account lock mode requested via <see cref="IIdentityContract.LockAccount"/>.
/// </summary>
public enum LockType
{
    Temporary = 0,
    Permanent = 1,
}

