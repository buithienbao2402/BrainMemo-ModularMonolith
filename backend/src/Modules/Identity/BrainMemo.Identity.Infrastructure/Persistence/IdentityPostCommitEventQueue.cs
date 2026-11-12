using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Identity.Infrastructure.Persistence;

/// <summary>
/// Scoped in-memory queue storing Identity integration events until <see cref="IdentityUnitOfWork"/> commits.
/// </summary>
internal sealed class IdentityPostCommitEventQueue : IPostCommitEventQueue
{
    private readonly List<IntegrationEvent> _events = [];

    public void Enqueue(IntegrationEvent integrationEvent)
    {
        ArgumentNullException.ThrowIfNull(integrationEvent);
        _events.Add(integrationEvent);
    }

    public IReadOnlyList<IntegrationEvent> DrainAll()
    {
        if (_events.Count == 0)
        {
            return [];
        }

        IntegrationEvent[] snapshot = [.. _events];
        _events.Clear();
        return snapshot;
    }

    public void Clear() => _events.Clear();
}
