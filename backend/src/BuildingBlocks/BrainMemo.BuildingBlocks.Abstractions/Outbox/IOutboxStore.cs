namespace BrainMemo.BuildingBlocks.Abstractions.Outbox;

/// <summary>
/// Table-agnostic persistence port for reading and writing module outbox rows (<c>crs_outbox_event</c>,
/// <c>lrn_outbox_event</c>, <c>ast_outbox_event</c>).
/// </summary>
public interface IOutboxStore
{
    string ModuleName { get; }

    Task<bool> ExistsAsync(Guid eventId, CancellationToken ct = default);

    Task AddAsync(OutboxMessage message, CancellationToken ct = default);

    Task<IReadOnlyList<OutboxMessage>> GetUnpublishedAsync(
        int batchSize,
        int maxAttempts,
        CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
