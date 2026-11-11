namespace BrainMemo.BuildingBlocks.Abstractions.Persistence;

/// <summary>
/// Represents an active unit-of-work database transaction.
/// </summary>
public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct = default);

    Task RollbackAsync(CancellationToken ct = default);
}

/// <summary>
/// Module-scoped unit of work used by <c>TransactionBehavior</c> without cross-module DbContext coupling.
/// </summary>
public interface IUnitOfWork
{
    string ModuleName { get; }

    Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
