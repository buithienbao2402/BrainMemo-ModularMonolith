namespace BrainMemo.SharedKernel.Time;

/// <summary>
/// Application-side UUIDv7 generator aligned with BINARY(16) primary keys.
/// </summary>
public static class UuidV7
{
    public static Guid NewGuid() => Guid.CreateVersion7();

    public static Guid NewGuid(DateTimeOffset timestamp) => Guid.CreateVersion7(timestamp);
}
