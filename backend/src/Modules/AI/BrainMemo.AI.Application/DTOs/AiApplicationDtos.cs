namespace BrainMemo.AI.Application.DTOs;

public sealed record AiJobDto(
    Guid Id,
    string JobType,
    string Status,
    int? ResultCount,
    string? ErrorMessage,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt);

public sealed record AiQuotaDto(
    int Used,
    int Limit,
    int Remaining);

public sealed record SystemSettingsDto(
    int AiDailyQuota,
    string AiLlmProvider);
