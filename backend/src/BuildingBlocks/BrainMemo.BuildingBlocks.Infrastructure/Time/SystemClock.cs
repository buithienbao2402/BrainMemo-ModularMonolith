using BrainMemo.SharedKernel.Time;

namespace BrainMemo.BuildingBlocks.Infrastructure.Time;

/// <summary>
/// Default UTC system clock implementation.
/// </summary>
public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
