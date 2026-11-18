using BrainMemo.AI.Application.Abstractions;
using BrainMemo.AI.Contracts;
using BrainMemo.AI.Contracts.Dtos;
using BrainMemo.AI.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Settings;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.AI.Infrastructure.Contracts;

public sealed class AiContractService(IAiRepository aiRepository) : IAiContract
{
    public Result<DailyQuotaDto> GetDailyQuota(Guid userId)
    {
        SystemSetting? quotaSetting = aiRepository.GetSettingAsync(SystemSettingKeys.AiDailyQuota).GetAwaiter().GetResult();
        int limit = 20;
        if (quotaSetting is not null && int.TryParse(quotaSetting.Value, out int parsedLimit))
        {
            limit = parsedLimit;
        }

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        AiUserDailyQuota quota = aiRepository.GetOrCreateDailyQuotaAsync(userId, today, limit).GetAwaiter().GetResult();
        int remaining = Math.Max(0, quota.QuotaLimit - quota.UsedCount);

        return Result.Success(new DailyQuotaDto(quota.UsedCount, quota.QuotaLimit, remaining));
    }
}
