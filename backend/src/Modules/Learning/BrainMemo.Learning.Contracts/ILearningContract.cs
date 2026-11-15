using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Contracts;

public interface ILearningContract
{
    Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId);
    Result<bool> IsBlockCompleted(Guid userId, Guid blockId);
    Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId);
    Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId);
    Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback);
    Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit);
    Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId);
    Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt);
    Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId);
    Result SoftDeleteComment(Guid commentId, Guid actorAdminId);
    Result RestoreComment(Guid commentId, Guid actorAdminId);
    Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId);
}
