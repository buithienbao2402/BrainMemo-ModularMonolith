using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using Microsoft.EntityFrameworkCore.Storage;

namespace BrainMemo.Identity.Infrastructure.Persistence;

/// <summary>
/// Identity module unit-of-work wrapper consumed by <c>TransactionBehavior</c>.
/// </summary>
internal sealed class IdentityUnitOfWork(IdentityDbContext dbContext) : IUnitOfWork
{
    public string ModuleName => "Identity";

    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        IDbContextTransaction transaction = await dbContext.Database
            .BeginTransactionAsync(ct)
            .ConfigureAwait(false);

        return new EfUnitOfWorkTransaction(transaction);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => dbContext.SaveChangesAsync(ct);

    private sealed class EfUnitOfWorkTransaction(IDbContextTransaction inner) : IUnitOfWorkTransaction
    {
        public Task CommitAsync(CancellationToken ct = default)
            => inner.CommitAsync(ct);

        public Task RollbackAsync(CancellationToken ct = default)
            => inner.RollbackAsync(ct);

        public ValueTask DisposeAsync()
            => inner.DisposeAsync();
    }
}

