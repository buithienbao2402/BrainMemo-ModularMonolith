namespace BrainMemo.SharedKernel.Time;

/// <summary>
/// Time abstraction returning current UTC time (contracts/README.md §2, AGENT.md §4).
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
