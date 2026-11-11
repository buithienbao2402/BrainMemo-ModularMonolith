using BrainMemo.BuildingBlocks.Abstractions.Transactions;

namespace BrainMemo.BuildingBlocks.Infrastructure.Transactions;

/// <summary>
/// AsyncLocal-backed accessor tracking the active ambient moderation transaction (DEC-04).
/// </summary>
public sealed class AmbientTransactionAccessor : IAmbientTransactionAccessor
{
    private static readonly AsyncLocal<Holder?> CurrentHolder = new();

    public IModerationTxContext? Current => CurrentHolder.Value?.Context;

    public IDisposable Push(IModerationTxContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        Holder? previous = CurrentHolder.Value;
        CurrentHolder.Value = new Holder(context);
        return new Scope(previous);
    }

    private sealed record Holder(IModerationTxContext Context);

    private sealed class Scope(Holder? previous) : IDisposable
    {
        private bool _disposed;

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            CurrentHolder.Value = previous;
            _disposed = true;
        }
    }
}
