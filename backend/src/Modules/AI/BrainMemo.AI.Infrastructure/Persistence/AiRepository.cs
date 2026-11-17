using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.AI.Infrastructure.Persistence;

public sealed class AiRepository(AiDbContext dbContext) : IAiRepository
{
    public async Task<AiGenerationJob?> GetJobByIdAsync(Guid jobId, CancellationToken ct = default)
    {
        return await dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct);
    }

    public async Task AddJobAsync(AiGenerationJob job, CancellationToken ct = default)
    {
        await dbContext.Jobs.AddAsync(job, ct);
    }

    public Task UpdateJobAsync(AiGenerationJob job, CancellationToken ct = default)
    {
        dbContext.Jobs.Update(job);
        return Task.CompletedTask;
    }

    public async Task<AiUserDailyQuota> GetOrCreateDailyQuotaAsync(Guid userId, DateOnly date, int defaultLimit, CancellationToken ct = default)
    {
        AiUserDailyQuota? quota = await dbContext.DailyQuotas
            .FirstOrDefaultAsync(q => q.UserId == userId && q.QuotaDate == date, ct);

        if (quota is null)
        {
            quota = new AiUserDailyQuota(Guid.NewGuid(), userId, date, defaultLimit, 0);
            await dbContext.DailyQuotas.AddAsync(quota, ct);
            await dbContext.SaveChangesAsync(ct);
        }

        return quota;
    }

    public async Task<bool> TryIncrementDailyQuotaAsync(Guid userId, DateOnly date, int limit, CancellationToken ct = default)
    {
        AiUserDailyQuota quota = await GetOrCreateDailyQuotaAsync(userId, date, limit, ct);

        if (!quota.TryIncrement())
        {
            return false;
        }

        dbContext.DailyQuotas.Update(quota);
        await dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<SystemSetting?> GetSettingAsync(string key, CancellationToken ct = default)
    {
        return await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
    }

    public async Task SetSettingAsync(string key, string jsonValue, Guid? updatedBy, CancellationToken ct = default)
    {
        SystemSetting? setting = await dbContext.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting is null)
        {
            setting = new SystemSetting(key, jsonValue, updatedBy);
            await dbContext.SystemSettings.AddAsync(setting, ct);
        }
        else
        {
            setting.UpdateValue(jsonValue, updatedBy);
            dbContext.SystemSettings.Update(setting);
        }
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await dbContext.SaveChangesAsync(ct);
    }
}
