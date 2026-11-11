namespace BrainMemo.BuildingBlocks.Abstractions.Settings;

/// <summary>
/// Well-known keys stored in sys_setting (DEC-12, DEC-21).
/// </summary>
public static class SystemSettingKeys
{
    public const string AiFlagThreshold = "ai.flag_threshold";
    public const string AiDailyQuota = "ai.daily_quota";
    public const string AiLlmProvider = "ai.llm_provider";
}

/// <summary>
/// Typed access to runtime sys_setting entries (contracts/README.md §2).
/// </summary>
public interface ISystemSettings
{
    Task<T> Get<T>(string key, CancellationToken ct = default);

    Task Set<T>(string key, T value, Guid actor, CancellationToken ct = default);
}
