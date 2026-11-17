namespace BrainMemo.AI.Application.Abstractions;

public interface IAiJobQueue
{
    ValueTask EnqueueAsync(Guid jobId, CancellationToken ct = default);
    ValueTask<Guid> DequeueAsync(CancellationToken ct = default);
}
