using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.Grading;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Learning.Contracts;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Assessment.Infrastructure.Contracts;

public class AssessmentContractService : IAssessmentContract
{
    private readonly IAssessmentRepository _repository;
    private readonly ILearningContract _learningContract;
    private readonly IEnumerable<IGradingStrategy> _strategies;
    private readonly IOutboxWriter? _outboxWriter;
    private readonly ILogger<AssessmentContractService> _logger;

    public AssessmentContractService(
        IAssessmentRepository repository,
        ILearningContract learningContract,
        IEnumerable<IGradingStrategy> strategies,
        ILogger<AssessmentContractService> logger,
        IOutboxWriter? outboxWriter = null)
    {
        _repository = repository;
        _learningContract = learningContract;
        _strategies = strategies;
        _logger = logger;
        _outboxWriter = outboxWriter;
    }

    public Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId)
    {
        return GradeQuizAttemptAsync(attemptId).GetAwaiter().GetResult();
    }

    private async Task<Result<GradeQuizAttemptResult>> GradeQuizAttemptAsync(Guid attemptId)
    {
        var attemptResult = _learningContract.GetQuizAttemptForGrading(attemptId);
        if (!attemptResult.IsSuccess || attemptResult.Value == null)
        {
            return Result.Failure<GradeQuizAttemptResult>(
                attemptResult.Error ?? Error.NotFound($"Quiz attempt {attemptId} not found"));
        }

        var attempt = attemptResult.Value;
        var questionGrades = new List<QuestionGrade>();
        decimal calculatedTotalScore = 0m;
        decimal totalMaxScore = 0m;
        bool hasManual = false;

        foreach (var q in attempt.Questions)
        {
            totalMaxScore += q.MaxPoints;
            var strategy = _strategies.FirstOrDefault(s => s.CanHandle(q.QuestionType));

            if (strategy == null)
            {
                // Fallback default: if essay/unknown treat as manual, otherwise fail
                if (q.QuestionType.Contains("ESSAY", StringComparison.OrdinalIgnoreCase))
                {
                    hasManual = true;
                    questionGrades.Add(new QuestionGrade(q.QuestionId, null, null));
                }
                else
                {
                    questionGrades.Add(new QuestionGrade(q.QuestionId, 0m, false));
                }
                continue;
            }

            var gradeRes = strategy.Grade(q);
            if (gradeRes.PendingManual)
            {
                hasManual = true;
                questionGrades.Add(new QuestionGrade(q.QuestionId, null, null));
            }
            else
            {
                calculatedTotalScore += gradeRes.PointsEarned ?? 0m;
                questionGrades.Add(new QuestionGrade(q.QuestionId, gradeRes.PointsEarned, gradeRes.IsCorrect));
            }
        }

        bool isFullyGraded = !hasManual;
        decimal? finalScore = isFullyGraded ? calculatedTotalScore : null;
        decimal passPercent = attempt.PassScorePercent ?? 50.0m;
        bool? isPassed = isFullyGraded ? (totalMaxScore > 0 ? (calculatedTotalScore / totalMaxScore * 100m >= passPercent) : true) : null;
        var now = DateTimeOffset.UtcNow;

        var component = await _repository.GetOrCreateDefaultComponentAsync(
            attempt.CourseId,
            "QUIZ",
            attempt.QuizBlockId,
            "Quiz Component",
            totalMaxScore);

        var existingRecord = await _repository.GetGradeRecordBySourceAttemptIdAsync(attemptId);
        Guid recordId = existingRecord?.Id ?? Guid.NewGuid();

        if (existingRecord == null)
        {
            var record = new GradeRecord(
                recordId,
                attempt.UserId,
                attempt.CourseId,
                component.Id,
                GradeRecordType.QuizAttempt,
                attempt.AttemptId,
                null,
                finalScore,
                totalMaxScore,
                isFullyGraded,
                isFullyGraded ? now : null);

            await _repository.UpsertGradeRecordAsync(record);
        }
        else
        {
            existingRecord.UpdateScore(finalScore, totalMaxScore, isFullyGraded, isFullyGraded ? now : null);
            await _repository.UpsertGradeRecordAsync(existingRecord);
        }

        await _repository.SaveChangesAsync();

        if (isFullyGraded && _outboxWriter != null)
        {
            var evt = new GradeRecordedIntegrationEvent(
                Guid.NewGuid(),
                now,
                recordId,
                attempt.UserId,
                attempt.CourseId,
                component.Id,
                "QUIZ_ATTEMPT",
                attempt.AttemptId,
                null,
                finalScore,
                totalMaxScore,
                isFullyGraded,
                now);

            try
            {
                await _outboxWriter.WriteAsync(recordId, evt);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write GradeRecordedIntegrationEvent to outbox");
            }
        }

        return Result.Success(new GradeQuizAttemptResult(
            calculatedTotalScore,
            totalMaxScore,
            hasManual,
            passPercent,
            isPassed,
            questionGrades));
    }

    public Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds)
    {
        var list = questionIds.Select(id => new QuestionUsageDto(id, 0, 0, null)).ToList();
        return Result.Success<IReadOnlyList<QuestionUsageDto>>(list);
    }

    public Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId)
    {
        var records = _repository.GetGradeRecordsForStudentAsync(courseId, userId).GetAwaiter().GetResult();
        var items = records.Select(r => new GradeItemDto(
            r.Id,
            r.ComponentId.ToString(),
            r.RecordType.ToString(),
            r.Score,
            r.MaxScore,
            r.IsFullyGraded)).ToList();

        decimal? finalScore = null;
        if (items.Count > 0 && items.All(i => i.IsGraded && i.Score.HasValue))
        {
            finalScore = items.Average(i => i.Score!.Value);
        }

        return Result.Success(new GradebookDto(userId, courseId, items, finalScore, finalScore >= 50.0m));
    }

    public Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId)
    {
        return Result.Success<IReadOnlyList<CloStatDto>>(Array.Empty<CloStatDto>());
    }
}
