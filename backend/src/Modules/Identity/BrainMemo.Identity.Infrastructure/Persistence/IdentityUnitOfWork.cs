using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.BuildingBlocks.Abstractions.Persistence;
using BrainMemo.SharedKernel.Events;
using Microsoft.EntityFrameworkCore.Storage;

namespace BrainMemo.Identity.Infrastructure.Persistence;

/// <summary>
/// Identity module unit-of-work wrapper consumed by <c>TransactionBehavior</c>, publishing buffered events strictly after commit.
/// </summary>
internal sealed class IdentityUnitOfWork(
    IdentityDbContext dbContext,
    IdentityPostCommitEventQueue postCommitEvents,
    IEventBus eventBus) : IUnitOfWork
{
    public string ModuleName => "Identity";

    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct = default)
    {
        postCommitEvents.Clear();

        IDbContextTransaction transaction = await dbContext.Database
            .BeginTransactionAsync(ct)
            .ConfigureAwait(false);

        return new EfUnitOfWorkTransaction(transaction, postCommitEvents, eventBus);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default)
        => dbContext.SaveChangesAsync(ct);

    private sealed class EfUnitOfWorkTransaction(
        IDbContextTransaction inner,
        IdentityPostCommitEventQueue postCommitEvents,
        IEventBus eventBus) : IUnitOfWorkTransaction
    {
        private bool _committed;
        private bool _rolledBack;

        public async Task CommitAsync(CancellationToken ct = default)
        {
            await inner.CommitAsync(ct).ConfigureAwait(false);
            _committed = true;

            IReadOnlyList<IntegrationEvent> events = postCommitEvents.DrainAll();
            foreach (IntegrationEvent integrationEvent in events)
            {
                await eventBus.Publish(integrationEvent, ct).ConfigureAwait(false);
            }
        }

        public Task RollbackAsync(CancellationToken ct = default)
        {
            postCommitEvents.Clear();

            if (_committed || _rolledBack)
            {
                return Task.CompletedTask;
            }

            _rolledBack = true;
            return inner.RollbackAsync(ct);
        }

        public ValueTask DisposeAsync()
        {
            postCommitEvents.Clear();
            return inner.DisposeAsync();
        }
    }
}
