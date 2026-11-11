```csharp
public interface IAssessmentContract {
  Result<GradeQuizAttemptResult> GradeQuizAttempt(Guid attemptId);          // đồng bộ, idempotent; đọc đề qua Learning.GetQuizAttemptForGrading; IGradingStrategy từng câu
  Result<IReadOnlyList<QuestionUsageDto>> GetQuestionUsageStats(IReadOnlyList<Guid> questionIds);
  Result<GradebookDto> GetStudentGradebook(Guid userId, Guid courseId);
  Result<IReadOnlyList<CloStatDto>> GetCloAttainmentStats(Guid courseId);
}
public record GradeQuizAttemptResult(decimal TotalScore, decimal MaxScore, bool PendingManual, decimal? PassScorePercent, bool? IsPassed, IReadOnlyList<QuestionGrade> Questions);
public record QuestionGrade(Guid QuestionId, decimal? PointsEarned, bool? IsCorrect);
```
Quy tắc: `IsPassed = (Total/Max*100) ≥ PassScorePercent`; null nếu bài không đặt hoặc còn tự luận chờ chấm. `pass_score` (bài) ≠ `pass_threshold` (CLO/tổng kết). Ghi `ast_grade_record` bằng upsert theo `source_attempt_id` (UNIQUE, DEC-01). `GradeRecorded` vào `ast_outbox_event` cùng TX khi không còn câu chờ chấm tay. Mức đạt CLO **tính khi đọc** (công thức 3.5.2), không lưu.
Gọi ra: Content `GetAssessableBlocks`, `GetPublishedQuizDefinition`, `GetQuestionsByIds`; Learning `GetQuizAttemptForGrading`, `GetQuizAttemptSummary`, `GetAssignmentSubmission`, `ApplyManualQuestionGrades`, `MarkAssignmentGraded`; Identity `GetUserSummary`; Course `GetCourseAccess`.
Event phát (Outbox): `GradeRecorded`, `CourseReviewCreated`, `CourseReviewUpdated`, `CourseReviewReplied`. Tiêu thụ: `QuizAttemptSubmitted` (chấm lại nếu lỗi), `AssignmentSubmitted` (tạo grade_record chờ chấm), `ChapterPublished.removedBlockIds`, `CoursePermanentlyDeleted`.
Contract Version: 1