using System.Data.Common;

namespace BrainMemo.BuildingBlocks.Abstractions.Transactions;

/// <summary>
/// Shared ambient database connection and transaction used only by Moderation sanction flows (DEC-04).
/// </summary>
public interface IModerationTxContext
{
    DbConnection Connection { get; }

    DbTransaction Transaction { get; }

    CancellationToken CancellationToken { get; }
}

/// <summary>
/// Exposes the active ambient moderation transaction, if any, to target module DbContexts.
/// </summary>
public interface IAmbientTransactionAccessor
{
    IModerationTxContext? Current { get; }
}

/// <summary>
/// Coordinates cross-module synchronous sanction transactions for the Moderation module only (DEC-04).
/// </summary>
public interface IModerationTransaction
{
    Task<T> RunAsync<T>(Func<IModerationTxContext, Task<T>> work, CancellationToken ct = default);
}
