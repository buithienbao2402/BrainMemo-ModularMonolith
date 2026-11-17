using System.Text.Json;
using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Settings;

namespace BrainMemo.AI.Infrastructure.Services;

public sealed class SystemSettingsService(IAiRepository aiRepository) : ISystemSettings
{
    public async Task<T> Get<T>(string key, CancellationToken ct = default)
    {
        SystemSetting? setting = await aiRepository.GetSettingAsync(key, ct);
        if (setting is null || string.IsNullOrWhiteSpace(setting.Value))
        {
            if (key == SystemSettingKeys.AiDailyQuota && typeof(T) == typeof(int))
            {
                return (T)(object)20;
            }

            if (key == SystemSettingKeys.AiLlmProvider && typeof(T) == typeof(string))
            {
                return (T)(object)"GEMINI";
            }

            return default!;
        }

        try
        {
            if (typeof(T) == typeof(int) && int.TryParse(setting.Value, out int intVal))
            {
                return (T)(object)intVal;
            }

            if (typeof(T) == typeof(string))
            {
                string raw = setting.Value.Trim();
                if (raw.StartsWith('"') && raw.EndsWith('"') && raw.Length >= 2)
                {
                    raw = raw[1..^1];
                }
                return (T)(object)raw;
            }

            return JsonSerializer.Deserialize<T>(setting.Value)!;
        }
        catch
        {
            return default!;
        }
    }

    public async Task Set<T>(string key, T value, Guid actor, CancellationToken ct = default)
    {
        string json = JsonSerializer.Serialize(value);
        await aiRepository.SetSettingAsync(key, json, actor, ct);
        await aiRepository.SaveChangesAsync(ct);
    }
}
