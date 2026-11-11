namespace BrainMemo.BuildingBlocks.Infrastructure.Outbox;

/// <summary>
/// Configuration options for <see cref="OutboxDispatcher"/> polling and retry behavior.
/// </summary>
public sealed class OutboxOptions
{
    public const string SectionName = "Outbox";

    public bool Enabled { get; set; } = true;

    public TimeSpan PollingInterval { get; set; } = TimeSpan.FromSeconds(2);

    public int BatchSize { get; set; } = 50;

    public int MaxAttempts { get; set; } = 10;

    public int DeduplicationCacheSize { get; set; } = 10_000;

    internal TimeSpan GetNormalizedPollingInterval()
        => PollingInterval > TimeSpan.Zero ? PollingInterval : TimeSpan.FromMilliseconds(50);

    internal int GetNormalizedBatchSize()
        => Math.Clamp(BatchSize, 1, 500);

    internal int GetNormalizedMaxAttempts()
        => MaxAttempts < 0 ? 0 : MaxAttempts;

    internal int GetNormalizedCacheSize()
        => DeduplicationCacheSize <= 0 ? 1 : DeduplicationCacheSize;
}
