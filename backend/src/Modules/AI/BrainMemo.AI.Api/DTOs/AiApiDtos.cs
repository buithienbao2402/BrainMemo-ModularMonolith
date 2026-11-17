namespace BrainMemo.AI.Api.DTOs;

public sealed record AiJobRequest(
    string SourceKind,
    string? SourceText = null,
    Guid? SourceChapterId = null,
    int? Count = null,
    string? Difficulty = null,
    IReadOnlyList<string>? TypeFilter = null);

public sealed record SystemSettingsRequest(
    int? AiDailyQuota = null,
    string? AiLlmProvider = null);
