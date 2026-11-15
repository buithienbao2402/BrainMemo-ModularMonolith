using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Common;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Infrastructure.Contracts;

public sealed class LearningContractService(
    ILearningRepository learningRepository,
    IContentContract contentContract) : ILearningContract
{
    public Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId)
    {
        CourseProgressDto progress = LearningProgressCalculator.CalculateProgressAsync(
            courseId,
            userId,
            learningRepository,
            contentContract).GetAwaiter().GetResult();

        return Result.Success(progress);
    }

    public Result<bool> IsBlockCompleted(Guid userId, Guid blockId)
    {
        BlockCompletion? completion = learningRepository
            .GetBlockCompletionAsync(userId, blockId)
            .GetAwaiter().GetResult();

        return Result.Success(completion is not null);
    }

    public Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId)
    {
        return Result.Failure<QuizAttemptSummaryDto>(Error.NotFound("Chưa có lượt thi."));
    }

    public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId)
    {
        return Result.Failure<AttemptForGradingDto>(Error.NotFound("Chưa có lượt thi để chấm."));
    }

    public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback)
    {
        return Result.Success();
    }

    public Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit)
    {
        Page<Guid> page = learningRepository
            .ListInProgressCourseIdsAsync(userId, afterId, limit)
            .GetAwaiter().GetResult();

        return Result.Success(page);
    }

    public Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId)
    {
        return Result.Failure<AssignmentSubmissionDto>(Error.NotFound("Chưa có bài nộp."));
    }

    public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt)
    {
        return Result.Success();
    }

    public Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId)
    {
        return Result.Failure<ReportTargetDto>(Error.NotFound("Bình luận không tồn tại."));
    }

    public Result SoftDeleteComment(Guid commentId, Guid actorAdminId)
    {
        return Result.Success();
    }

    public Result RestoreComment(Guid commentId, Guid actorAdminId)
    {
        return Result.Success();
    }

    public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId)
    {
        int completedCount = learningRepository
            .CountCourseCompletionsAsync(courseId)
            .GetAwaiter().GetResult();

        return Result.Success(new CourseLearningStatsDto(
            CompletedLearnerCount: completedCount,
            CommentCount: 0));
    }
}
