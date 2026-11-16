using System.Data.Common;
using BrainMemo.BuildingBlocks.Abstractions.Transactions;
using BrainMemo.BuildingBlocks.Infrastructure.Transactions;
using BrainMemo.Moderation.Infrastructure.Persistence;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace BrainMemo.Moderation.Infrastructure.Transactions;

public sealed class ModerationTransaction(
    ModerationDbContext dbContext,
    IAmbientTransactionAccessor ambientTransactionAccessor) : IModerationTransaction
{
    private sealed class ModerationTxContext(
        DbConnection connection,
        DbTransaction transaction,
        CancellationToken cancellationToken) : IModerationTxContext
    {
        public DbConnection Connection => connection;

        public DbTransaction Transaction => transaction;

        public CancellationToken CancellationToken => cancellationToken;
    }

    private sealed class InMemoryModerationTxContext(CancellationToken cancellationToken) : IModerationTxContext
    {
        public DbConnection Connection => null!;

        public DbTransaction Transaction => null!;

        public CancellationToken CancellationToken => cancellationToken;
    }

    public async Task<T> RunAsync<T>(Func<IModerationTxContext, Task<T>> work, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(work);

        if (!dbContext.Database.IsRelational())
        {
            return await work(new InMemoryModerationTxContext(ct)).ConfigureAwait(false);
        }

        await dbContext.Database.OpenConnectionAsync(ct).ConfigureAwait(false);
        await using IDbContextTransaction efTransaction = await dbContext.Database.BeginTransactionAsync(ct).ConfigureAwait(false);
        DbTransaction dbTransaction = efTransaction.GetDbTransaction();
        DbConnection dbConnection = dbContext.Database.GetDbConnection();

        ModerationTxContext context = new(dbConnection, dbTransaction, ct);

        IDisposable? scope = null;
        if (ambientTransactionAccessor is AmbientTransactionAccessor accessor)
        {
            scope = accessor.Push(context);
        }

        try
        {
            T outcome = await work(context).ConfigureAwait(false);

            if (outcome is Result { IsFailure: true })
            {
                await efTransaction.RollbackAsync(ct).ConfigureAwait(false);
                return outcome;
            }

            // Check if T is Result<TValue>
            if (outcome is not null && IsGenericResultFailure(outcome))
            {
                await efTransaction.RollbackAsync(ct).ConfigureAwait(false);
                return outcome;
            }

            await efTransaction.CommitAsync(ct).ConfigureAwait(false);
            return outcome;
        }
        catch
        {
            await efTransaction.RollbackAsync(CancellationToken.None).ConfigureAwait(false);
            throw;
        }
        finally
        {
            scope?.Dispose();
        }
    }

    private static bool IsGenericResultFailure(object outcome)
    {
        var type = outcome.GetType();
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Result<>))
        {
            var prop = type.GetProperty("IsFailure");
            if (prop?.GetValue(outcome) is true)
            {
                return true;
            }
        }

        return false;
    }
}
