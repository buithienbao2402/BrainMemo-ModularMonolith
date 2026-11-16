using BrainMemo.Assessment.Contracts;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Common;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Learning.Application.Commands.SubmitQuizAttempt;

public sealed class SubmitQuizAttemptCommandHandler : ICommandHandler<SubmitQuizAttemptCommand, QuizSubmitResultDto>
{
    private readonly ILearningRepository _learningRepository;
    private readonly IAssessmentContract _assessmentContract;
    private readonly IContentContract _contentContract;
    private readonly IOutboxWriter? _outboxWriter;
    private readonly ILogger<SubmitQuizAttemptCommandHandler> _logger;

    public SubmitQuizAttemptCommandHandler(
        ILearningRepository learningRepository,
        IAssessmentContract assessmentContract,
        IContentContract contentContract,
        ILogger<SubmitQuizAttemptCommandHandler> logger,
        IOutboxWriter? outboxWriter = null)
    {
        _learningRepository = learningRepository;
        _assessmentContract = assessmentContract;
        _contentContract = contentContract;
        _logger = logger;
        _outboxWriter = outboxWriter;
    }

    public async Task<Result<QuizSubmitResultDto>> Handle(SubmitQuizAttemptCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var attempt = await _learningRepository.GetQuizAttemptByIdAsync(request.AttemptId, cancellationToken);
        if (attempt == null)
        {
            return Result.Failure<QuizSubmitResultDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        if (attempt.UserId != request.UserId)
        {
            return Result.Failure<QuizSubmitResultDto>(Error.Forbidden("Bạn không có quyền nộp bài thi này."));
        }

        if (attempt.Status == "GRADED")
        {
            return Result.Success(new QuizSubmitResultDto(attempt.Id, attempt.Status, attempt.TotalScore, attempt.MaxScore, true));
        }

        // ==========================================
        // ADR-04: TX1 - Mark SUBMITTED & Commit
        // ==========================================
        bool autoSubmitted = attempt.IsExpired(now);
        attempt.Submit(now, autoSubmitted: autoSubmitted);
        await _learningRepository.SaveChangesAsync(cancellationToken);

        // ==========================================
        // ADR-04: Outside TX - Call Assessment Module
        // ==========================================
        Result<GradeQuizAttemptResult> gradeResult;
        try
        {
            gradeResult = _assessmentContract.GradeQuizAttempt(attempt.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call AssessmentContract.GradeQuizAttempt for attempt {AttemptId}", attempt.Id);
            return Result.Success(new QuizSubmitResultDto(attempt.Id, attempt.Status, attempt.TotalScore, attempt.MaxScore, null));
        }

        if (!gradeResult.IsSuccess || gradeResult.Value == null)
        {
            _logger.LogWarning("Assessment grading returned failure: {Error}", gradeResult.Error?.Message);
            return Result.Success(new QuizSubmitResultDto(attempt.Id, attempt.Status, attempt.TotalScore, attempt.MaxScore, null));
        }

        var grading = gradeResult.Value;

        // ==========================================
        // ADR-04: TX2 - Apply grading & complete block
        // ==========================================
        if (!grading.PendingManual)
        {
            attempt.ApplyGrading(grading.TotalScore, now);

            var answers = await _learningRepository.GetQuizAttemptAnswersAsync(attempt.Id, cancellationToken);
            foreach (var qg in grading.Questions)
            {
                var ans = answers.FirstOrDefault(a => a.QuestionId == qg.QuestionId);
                if (ans != null)
                {
                    ans.SetGrade(qg.PointsEarned ?? 0m, qg.IsCorrect ?? false, now);
                }
            }

            if (grading.IsPassed == true)
            {
                var existingCompletion = await _learningRepository.GetBlockCompletionAsync(attempt.UserId, attempt.QuizBlockId, cancellationToken);
                if (existingCompletion == null)
                {
                    var blockCompletion = new BlockCompletion(
                        Guid.NewGuid(),
                        attempt.UserId,
                        attempt.CourseId,
                        Guid.Empty, // Will be resolved if needed
                        attempt.QuizBlockId,
                        LearningBlockType.Quiz,
                        now);

                    await _learningRepository.AddBlockCompletionAsync(blockCompletion, cancellationToken);

                    // Check course completion
                    try
                    {
                        var progress = await LearningProgressCalculator.CalculateProgressAsync(
                            attempt.CourseId,
                            attempt.UserId,
                            _learningRepository,
                            _contentContract);

                        if (progress.Percent >= 100 && progress.CourseCompletedAt.HasValue)
                        {
                            var existingCourseCompletion = await _learningRepository.GetCourseCompletionAsync(attempt.UserId, attempt.CourseId, cancellationToken);
                            if (existingCourseCompletion == null)
                            {
                                await _learningRepository.AddCourseCompletionAsync(
                                    new CourseCompletion(Guid.NewGuid(), attempt.UserId, attempt.CourseId, now),
                                    cancellationToken);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Error checking course completion after quiz attempt");
                    }
                }
            }
        }

        await _learningRepository.SaveChangesAsync(cancellationToken);

        if (_outboxWriter != null)
        {
            try
            {
                await _outboxWriter.WriteAsync(attempt.Id, new QuizAttemptSubmitted(
                    Guid.NewGuid(),
                    now,
                    attempt.Id,
                    attempt.UserId,
                    attempt.CourseId,
                    Guid.Empty,
                    attempt.QuizBlockId,
                    attempt.QuizBlockId,
                    now,
                    autoSubmitted));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write QuizAttemptSubmitted to outbox");
            }
        }

        return Result.Success(new QuizSubmitResultDto(
            attempt.Id,
            attempt.Status,
            attempt.TotalScore,
            attempt.MaxScore,
            grading.IsPassed));
    }
}
