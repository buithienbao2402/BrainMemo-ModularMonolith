```csharp
public interface ILearningContract {
  Result<CourseProgressDto> GetCourseProgress(Guid userId, Guid courseId);
  Result<bool> IsBlockCompleted(Guid userId, Guid blockId);
  Result<QuizAttemptSummaryDto> GetQuizAttemptSummary(Guid attemptId);
  Result<AttemptForGradingDto> GetQuizAttemptForGrading(Guid attemptId);     // CHỈ server-to-server: questionSnapshot (đáp án đúng, điểm, passScorePercent?) + answers[]
  Result ApplyManualQuestionGrades(Guid attemptId, IReadOnlyList<ManualGrade> grades, Guid graderUserId, string? overallFeedback);
                                                                               // MỚI (DEC-03). Ghi points_earned/graded_by/graded_at/grader_feedback; points ≤ max_points; idempotent. KHÔNG đổi status attempt.
  Result<Page<Guid>> ListInProgressCourses(Guid userId, Guid? afterId, int limit);
  Result<AssignmentSubmissionDto> GetAssignmentSubmission(Guid submissionId);
  Result MarkAssignmentGraded(Guid submissionId, DateTimeOffset gradedAt);   // idempotent
  Result<ReportTargetDto> ResolveReportTarget(Guid commentId, Guid reporterUserId);
  Result SoftDeleteComment(Guid commentId, Guid actorAdminId);               // ẩn cả trả lời lồng
  Result RestoreComment(Guid commentId, Guid actorAdminId);
  Result<CourseLearningStatsDto> GetCourseLearningStats(Guid courseId);      // completedLearnerCount, commentCount
}
public record ManualGrade(Guid QuestionId, decimal Points, string? Feedback);
```
Gọi ra: Course `GetCourseAccess`, `CheckChapterAccess`; Identity `GetAccountStatus`; Content `ListPublishedBlocks`, `GetPublishedChapterContent`, `DrawQuizQuestions`, `VerifyQuizPassword`, `GetQuizExceptions`, `GetPublishedQuizDefinition`, `GetAssignmentDefinition`, `EvaluatePracticeAnswer`; Assessment `GradeQuizAttempt`.
Nộp bài (ADR-04): TX1 `SUBMITTED` + `lrn_outbox_event(QuizAttemptSubmitted)` → gọi `GradeQuizAttempt` NGOÀI transaction → TX2 ghi điểm. Lỗi/timeout → giữ `SUBMITTED`.
Event phát: Outbox: `QuizAttemptSubmitted`, `AssignmentSubmitted`; in-process: `BlockCompleted`, `ChapterCompleted`, `CourseCompleted`, `QuizAttemptStarted`, `CommentCreated`, `CommentDeleted`. Tiêu thụ: `GradeRecorded` (cập nhật điểm/`GRADED`/bài tập GRADED), `CoursePermanentlyDeleted`, `AccountLocked`.
Contract Version: 1