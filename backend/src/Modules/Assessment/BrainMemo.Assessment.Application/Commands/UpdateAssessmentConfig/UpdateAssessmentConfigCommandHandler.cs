using System.Text.Json;
using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Commands.UpdateAssessmentConfig;

public sealed class UpdateAssessmentConfigCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<UpdateAssessmentConfigCommand, AssessmentConfigDto>
{
    public async Task<Result<AssessmentConfigDto>> Handle(UpdateAssessmentConfigCommand request, CancellationToken cancellationToken)
    {
        if (request.PassThreshold < 0 || request.PassThreshold > 100)
        {
            return Result.Failure<AssessmentConfigDto>(Error.Validation("Ngưỡng đạt phải nằm trong khoảng 0 đến 100%."));
        }

        string rule = request.ScoreSelectionRule.ToUpperInvariant();
        if (rule != "HIGHEST" && rule != "LATEST" && rule != "AVERAGE")
        {
            return Result.Failure<AssessmentConfigDto>(Error.Validation("Quy tắc chọn điểm phải là HIGHEST, LATEST hoặc AVERAGE."));
        }

        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);

        string? gradeScaleJson = request.GradeScale != null ? JsonSerializer.Serialize(request.GradeScale) : null;
        string? achievementLevelsJson = request.AchievementLevels != null ? JsonSerializer.Serialize(request.AchievementLevels) : null;
        string? bloomScaleJson = request.BloomScale != null ? JsonSerializer.Serialize(request.BloomScale) : null;

        config.Update(
            request.PassThreshold,
            rule,
            gradeScaleJson,
            achievementLevelsJson,
            bloomScaleJson,
            request.PloEnabled);

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new AssessmentConfigDto(
            PassThreshold: config.PassThreshold,
            ScoreSelectionRule: config.ScoreSelectionRule,
            GradeScale: request.GradeScale,
            AchievementLevels: request.AchievementLevels,
            BloomScale: request.BloomScale,
            PloEnabled: config.PloEnabled));
    }
}
