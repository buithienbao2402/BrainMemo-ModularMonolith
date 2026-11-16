using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Assessment.Application.Commands.UpdateAssessmentConfig;

public sealed record UpdateAssessmentConfigCommand(
    Guid CourseId,
    decimal PassThreshold,
    string ScoreSelectionRule,
    IReadOnlyList<GradeScaleItemDto>? GradeScale,
    IReadOnlyList<AchievementLevelDto>? AchievementLevels,
    object? BloomScale,
    bool PloEnabled) : ICommand<AssessmentConfigDto>;
