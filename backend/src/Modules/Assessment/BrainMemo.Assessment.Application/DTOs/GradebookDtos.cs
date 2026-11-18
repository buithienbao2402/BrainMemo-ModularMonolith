namespace BrainMemo.Assessment.Application.DTOs;

public sealed record GradebookResponseDto(
    GradebookLearnerDto Learner,
    IReadOnlyList<GradebookComponentItemDto> Components,
    decimal? TotalGrade,
    string? Classification,
    IReadOnlyList<CloAchievementDto>? CloAchievements = null,
    IReadOnlyList<PloAchievementDto>? PloAchievements = null,
    bool AllCloAchieved = false);

public sealed record GradebookLearnerDto(
    Guid Id,
    string DisplayName,
    string? Email = null,
    string? AvatarUrl = null);

public sealed record GradebookComponentItemDto(
    Guid BlockId,
    string Title,
    decimal MaxScore,
    decimal CourseWeight,
    decimal? Final,
    decimal? Highest,
    decimal? Latest,
    decimal? Average,
    bool? IsPassed,
    string? Feedback,
    string Status);

public sealed record ComponentScoresDto(
    GradebookLearnerDto Learner,
    IReadOnlyList<ComponentAttemptScoreDto> Attempts,
    decimal? Highest,
    decimal? Latest,
    decimal? Average,
    decimal? Final);

public sealed record ComponentAttemptScoreDto(
    Guid AttemptId,
    decimal? Score,
    decimal MaxScore,
    DateTimeOffset? SubmittedAt,
    bool IsFullyGraded);
