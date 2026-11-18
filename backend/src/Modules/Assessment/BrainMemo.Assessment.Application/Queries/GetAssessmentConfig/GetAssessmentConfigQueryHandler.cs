using System.Text.Json;
using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetAssessmentConfig;

public sealed class GetAssessmentConfigQueryHandler(IAssessmentRepository repository)
    : IQueryHandler<GetAssessmentConfigQuery, AssessmentConfigDto>
{
    public async Task<Result<AssessmentConfigDto>> Handle(GetAssessmentConfigQuery request, CancellationToken cancellationToken)
    {
        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        IReadOnlyList<GradeScaleItemDto>? gradeScale = null;
        if (!string.IsNullOrWhiteSpace(config.GradeScaleJson))
        {
            try
            {
                gradeScale = JsonSerializer.Deserialize<List<GradeScaleItemDto>>(config.GradeScaleJson);
            }
            catch { }
        }

        IReadOnlyList<AchievementLevelDto>? achievementLevels = null;
        if (!string.IsNullOrWhiteSpace(config.AchievementLevelsJson))
        {
            try
            {
                achievementLevels = JsonSerializer.Deserialize<List<AchievementLevelDto>>(config.AchievementLevelsJson);
            }
            catch { }
        }

        object? bloomScale = null;
        if (!string.IsNullOrWhiteSpace(config.BloomScaleJson))
        {
            try
            {
                bloomScale = JsonSerializer.Deserialize<object>(config.BloomScaleJson);
            }
            catch { }
        }

        return Result.Success(new AssessmentConfigDto(
            PassThreshold: config.PassThreshold,
            ScoreSelectionRule: config.ScoreSelectionRule,
            GradeScale: gradeScale,
            AchievementLevels: achievementLevels,
            BloomScale: bloomScale,
            PloEnabled: config.PloEnabled));
    }
}
