namespace BrainMemo.AI.Contracts.Dtos;

public sealed record DailyQuotaDto(
    int Used,
    int Limit,
    int Remaining);
