namespace BrainMemo.Assessment.Application.DTOs;

public sealed record AssessmentConfigDto(
    decimal PassThreshold,
    string ScoreSelectionRule,
    IReadOnlyList<GradeScaleItemDto>? GradeScale,
    IReadOnlyList<AchievementLevelDto>? AchievementLevels,
    object? BloomScale,
    bool PloEnabled);

public sealed record GradeScaleItemDto(
    decimal Min,
    decimal Max,
    string Label);

public sealed record AchievementLevelDto(
    string Code,
    string Label,
    decimal MinPct,
    decimal MaxPct);

public sealed record ComponentDto(
    Guid BlockId,
    string SourceKind,
    string Title,
    decimal MaxScore,
    decimal? CourseWeight,
    bool IsComponent,
    IReadOnlyList<ComponentCloWeightDto>? CloWeights = null);

public sealed record ComponentCloWeightDto(
    Guid CloId,
    decimal Weight);

public sealed record UpsertComponentRequest(
    decimal CourseWeight,
    IReadOnlyList<ComponentCloWeightDto>? CloWeights = null);
