using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Assessment.Domain.Entities;

public class AssessmentConfig : AggregateRoot
{
    private AssessmentConfig() { }

    public AssessmentConfig(
        Guid id,
        Guid courseId,
        decimal passThreshold = 50.0m,
        string scoreSelectionRule = "HIGHEST",
        string? gradeScaleJson = null,
        string? achievementLevelsJson = null,
        string? bloomScaleJson = null,
        bool ploEnabled = false)
        : base(id)
    {
        CourseId = courseId;
        PassThreshold = passThreshold;
        ScoreSelectionRule = scoreSelectionRule;
        GradeScaleJson = gradeScaleJson;
        AchievementLevelsJson = achievementLevelsJson;
        BloomScaleJson = bloomScaleJson;
        PloEnabled = ploEnabled;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid CourseId { get; private set; }
    public decimal PassThreshold { get; private set; } = 50.0m;
    public string ScoreSelectionRule { get; private set; } = "HIGHEST";
    public string? GradeScaleJson { get; private set; }
    public string? AchievementLevelsJson { get; private set; }
    public string? BloomScaleJson { get; private set; }
    public bool PloEnabled { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        decimal passThreshold,
        string scoreSelectionRule,
        string? gradeScaleJson,
        string? achievementLevelsJson,
        string? bloomScaleJson,
        bool ploEnabled)
    {
        PassThreshold = passThreshold;
        ScoreSelectionRule = scoreSelectionRule;
        GradeScaleJson = gradeScaleJson;
        AchievementLevelsJson = achievementLevelsJson;
        BloomScaleJson = bloomScaleJson;
        PloEnabled = ploEnabled;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
