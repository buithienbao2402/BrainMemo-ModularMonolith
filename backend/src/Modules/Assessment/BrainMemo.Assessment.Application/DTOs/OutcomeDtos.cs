namespace BrainMemo.Assessment.Application.DTOs;

public sealed record CloDto(
    Guid? Id,
    string Code,
    string Description,
    string? BloomLevelCode = null,
    IReadOnlyList<Guid>? LinkedPloIds = null);

public sealed record PloDto(
    Guid? Id,
    string Code,
    string Description);

public sealed record CloContributionDto(
    Guid BlockId,
    string Title,
    decimal Weight,
    decimal ScorePct);

public sealed record CloAchievementDto(
    Guid CloId,
    string Code,
    decimal Pct,
    string Level,
    bool Achieved,
    IReadOnlyList<CloContributionDto> Contributions);

public sealed record PloAchievementDto(
    Guid PloId,
    string Code,
    decimal Pct,
    bool Achieved);

public sealed record ScoreBucketDto(
    string Range,
    int Count);

public sealed record HardestQuestionDto(
    Guid QuestionId,
    string Stem,
    decimal FailureRate);

public sealed record CloPassRateDto(
    Guid CloId,
    string Code,
    decimal PassRate);

public sealed record LevelDistributionDto(
    string Level,
    int Count);

public sealed record AssessmentStatsDto(
    IReadOnlyList<ScoreBucketDto> ScoreDistribution,
    IReadOnlyList<HardestQuestionDto> HardestQuestions,
    IReadOnlyList<CloPassRateDto> CloPassRates,
    IReadOnlyList<LevelDistributionDto> LevelDistribution);
