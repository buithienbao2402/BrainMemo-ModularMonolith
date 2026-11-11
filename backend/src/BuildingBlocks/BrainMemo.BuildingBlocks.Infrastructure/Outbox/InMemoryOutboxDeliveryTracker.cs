using Microsoft.Extensions.Options;

namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

public interface IOutboxDeliveryTracker
{
    bool Contains(Guid eventId);

    void MarkDelivered(Guid eventId);
}

/// <summary>
/// Thread-safe bounded cache of already-delivered <c>EventId</c> values preventing duplicate in-process
/// handler invocations if persisting <c>published_at</c> fails after <c>IEventBus.Publish</c> succeeds.
/// </summary>
public sealed class InMemoryOutboxDeliveryTracker(IOptions<OutboxOptions> options) : IOutboxDeliveryTracker
{
    private readonly int _capacity = (options ?? throw new ArgumentNullException(nameof(options))).Value.GetNormalizedCacheSize();
    private readonly HashSet<Guid> _deliveredIds = [];
    private readonly Queue<Guid> _fifoOrder = new();
    private readonly object _gate = new();

    public bool Contains(Guid eventId)
    {
        if (eventId == Guid.Empty)
        {
            return false;
        }

        lock (_gate)
        {
            return _deliveredIds.Contains(eventId);
        }
    }

    public void MarkDelivered(Guid eventId)
    {
        if (eventId == Guid.Empty)
        {
            return;
        }

        lock (_gate)
        {
            if (!_deliveredIds.Add(eventId))
            {
                return;
            }

            _fifoOrder.Enqueue(eventId);
            while (_fifoOrder.Count > _capacity)
            {
                Guid evicted = _fifoOrder.Dequeue();
                _deliveredIds.Remove(evicted);
            }
        }
    }
}
