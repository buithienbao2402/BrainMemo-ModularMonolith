using BrainMemo.SharedKernel.Events;

namespace BrainMemo.Identity.Application.Abstractions;

/// <summary>
/// Buffers in-process Identity integration events (including in-memory raw tokens) until the transaction commits.
/// </summary>
public interface IPostCommitEventQueue
{
    void Enqueue(IntegrationEvent integrationEvent);
}
