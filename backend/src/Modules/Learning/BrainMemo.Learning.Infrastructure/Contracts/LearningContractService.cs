using System.Text.Json;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Common;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Infrastructure.Contracts;

public sealed record QuestionSnapshotItem(
    Guid QuestionId,
    int Position,
    string QuestionType,
    bool AllowMultiple,
    decimal MaxPoints,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    IReadOnlyList<QuestionSnapshotOption> Options);

public sealed record QuestionSnapshotOption(
    Guid Id,
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool IsCorrect);

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
        QuizAttempt? attempt = learningRepository.GetQuizAttemptByIdAsync(attemptId).GetAwaiter().GetResult();
        if (attempt is null)
        {
            return Result.Failure<QuizAttemptSummaryDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        return Result.Success(new QuizAttemptSummaryDto(
            attempt.Id,
            attempt.QuizBlockId,
            attempt.UserId,
            attempt.Status,
            attempt.TotalScore.HasValue ? (double)attempt.TotalScore.Value : null,
            (double)attempt.MaxScore,
            attempt.StartedAt,
            attempt.SubmittedAt));
    }

    public Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId)
    {
        QuizAttempt? attempt = learningRepository.GetQuizAttemptByIdAsync(attemptId).GetAwaiter().GetResult();
        if (attempt is null)
        {
            return Result.Failure<AttemptForGradingDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        IReadOnlyList<QuizAttemptAnswer> answers = learningRepository.GetQuizAttemptAnswersAsync(attemptId).GetAwaiter().GetResult();
        var answerDict = answers.ToDictionary(a => a.QuestionId);

        List<QuestionSnapshotItem> snapshotItems = [];
        try
        {
            snapshotItems = JsonSerializer.Deserialize<List<QuestionSnapshotItem>>(attempt.QuestionSnapshot) ?? [];
        }
        catch
        {
            snapshotItems = [];
        }

        var quizDefResult = contentContract.GetPublishedQuizDefinition(attempt.QuizBlockId);
        decimal? passScorePercent = quizDefResult.IsSuccess ? quizDefResult.Value.PassScore : 50.0m;

        var questionsForGrading = new List<GradingQuestionItemDto>();

        foreach (var q in snapshotItems)
        {
            GradingAnswerPayloadDto? studentPayload = null;
            answerDict.TryGetValue(q.QuestionId, out var ans);
            if (ans != null && !string.IsNullOrWhiteSpace(ans.AnswerPayload))
            {
                try
                {
                    studentPayload = JsonSerializer.Deserialize<GradingAnswerPayloadDto>(ans.AnswerPayload);
                }
                catch
                {
                    studentPayload = null;
                }
            }

            var optionsDto = q.Options.Select(o => new GradingOptionItemDto(
                o.Id,
                o.Position,
                o.Content,
                o.MatchContent,
                o.BlankNo,
                o.IsCorrect)).ToList();

            questionsForGrading.Add(new GradingQuestionItemDto(
                q.QuestionId,
                q.Position,
                q.QuestionType,
                q.AllowMultiple,
                q.MaxPoints,
                optionsDto,
                q.ReferenceAnswer,
                studentPayload,
                ans?.PointsEarned,
                ans?.GraderFeedback));
        }

        return Result.Success(new AttemptForGradingDto(
            attempt.Id,
            attempt.CourseId,
            attempt.QuizBlockId,
            attempt.UserId,
            passScorePercent,
            questionsForGrading));
    }

    public Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback)
    {
        QuizAttempt? attempt = learningRepository.GetQuizAttemptByIdAsync(attemptId).GetAwaiter().GetResult();
        if (attempt is null)
        {
            return Result.Failure(Error.NotFound("Không tìm thấy lượt thi."));
        }

        IReadOnlyList<QuizAttemptAnswer> answers = learningRepository.GetQuizAttemptAnswersAsync(attemptId).GetAwaiter().GetResult();
        var now = DateTimeOffset.UtcNow;

        foreach (var grade in grades)
        {
            var ans = answers.FirstOrDefault(a => a.QuestionId == grade.QuestionId);
            if (ans != null)
            {
                ans.SetGrade(grade.Points, grade.Points > 0, now, graderUserId, grade.Feedback);
            }
        }

        decimal totalScore = answers.Sum(a => a.PointsEarned ?? 0m);
        attempt.ApplyGrading(totalScore, now);
        learningRepository.SaveChangesAsync().GetAwaiter().GetResult();

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
        AssignmentSubmission? sub = learningRepository.GetAssignmentSubmissionByIdAsync(submissionId).GetAwaiter().GetResult();
        if (sub is null)
        {
            return Result.Failure<AssignmentSubmissionDto>(Error.NotFound("Chưa có bài nộp."));
        }

        return Result.Success(new AssignmentSubmissionDto(
            SubmissionId: sub.Id,
            CourseId: sub.CourseId,
            AssignmentBlockId: sub.AssignmentBlockId,
            UserId: sub.UserId,
            Status: sub.Status,
            TextContent: sub.TextContent,
            FilesJson: sub.FilesJson,
            IsLate: sub.IsLate,
            SubmittedAt: sub.SubmittedAt));
    }

    public Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt)
    {
        AssignmentSubmission? sub = learningRepository.GetAssignmentSubmissionByIdAsync(submissionId).GetAwaiter().GetResult();
        if (sub != null)
        {
            sub.MarkGraded(gradedAt);
            learningRepository.SaveChangesAsync().GetAwaiter().GetResult();
        }
        return Result.Success();
    }

    public Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId)
    {
        Comment? comment = learningRepository.GetCommentByIdAsync(commentId).GetAwaiter().GetResult();
        if (comment is null)
        {
            return Result.Failure<ReportTargetDto>(Error.NotFound("Bình luận không tồn tại."));
        }

        return Result.Success(new ReportTargetDto(
            CommentId: comment.Id,
            CourseId: comment.CourseId,
            ChapterId: comment.ChapterId,
            AuthorUserId: comment.UserId,
            Content: comment.Content));
    }

    public Result SoftDeleteComment(Guid commentId, Guid actorAdminId)
    {
        Comment? comment = learningRepository.GetCommentByIdAsync(commentId).GetAwaiter().GetResult();
        if (comment is null)
        {
            return Result.Failure(Error.NotFound("Bình luận không tồn tại."));
        }

        comment.AdminSoftDelete(actorAdminId, DateTimeOffset.UtcNow);
        learningRepository.SaveChangesAsync().GetAwaiter().GetResult();
        return Result.Success();
    }

    public Result RestoreComment(Guid commentId, Guid actorAdminId)
    {
        Comment? comment = learningRepository.GetCommentByIdAsync(commentId).GetAwaiter().GetResult();
        if (comment is null)
        {
            return Result.Failure(Error.NotFound("Bình luận không tồn tại."));
        }

        comment.AdminRestore(actorAdminId, DateTimeOffset.UtcNow);
        learningRepository.SaveChangesAsync().GetAwaiter().GetResult();
        return Result.Success();
    }

    public Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId)
    {
        int completedCount = learningRepository
            .CountCourseCompletionsAsync(courseId)
            .GetAwaiter().GetResult();

        int commentCount = learningRepository
            .CountCommentsAsync(courseId)
            .GetAwaiter().GetResult();

        return Result.Success(new CourseLearningStatsDto(
            CompletedLearnerCount: completedCount,
            CommentCount: commentCount));
    }
}
