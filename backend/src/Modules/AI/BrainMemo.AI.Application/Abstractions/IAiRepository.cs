using BrainMemo.AI.Domain.Entities;

namespace BrainMemo.AI.Application.Abstractions;

public interface IAiRepository
{
    Task<AiGenerationJob?> GetJobByIdAsync(Guid jobId, CancellationToken ct = default);
    Task AddJobAsync(AiGenerationJob job, CancellationToken ct = default);
    Task UpdateJobAsync(AiGenerationJob job, CancellationToken ct = default);
    Task<AiUserDailyQuota> GetOrCreateDailyQuotaAsync(Guid userId, DateOnly date, int defaultLimit, CancellationToken ct = default);
    Task<bool> TryIncrementDailyQuotaAsync(Guid userId, DateOnly date, int limit, CancellationToken ct = default);
    Task<SystemSetting?> GetSettingAsync(string key, CancellationToken ct = default);
    Task SetSettingAsync(string key, string jsonValue, Guid? updatedBy, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
