using BrainMemo.AI.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.AI.Contracts;

public interface IAiContract
{
    Result<DailyQuotaDto> GetDailyQuota(Guid userId);
}
