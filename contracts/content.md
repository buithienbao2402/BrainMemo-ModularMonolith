```csharp
public interface IContentContract {
  Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds);
  Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId);
  Result<int> CountPublishedChapters(Guid courseId);
  Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId);          // KHÔNG đáp án; người gọi đã qua CheckChapterAccess
  Result<Page<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit);
  Result<PublishedBlockRef> GetPublishedBlock(Guid blockId);
  Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId);           // quiz+assignment đã đăng tải, maxScore (assignment không chấm bị loại)
  Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId);                 // cấu hình đóng băng, passScore(%), hasPassword
  Result VerifyQuizPassword(Guid quizBlockId, string password);                           // rate limit; QUIZ_PASSWORD_INVALID
  Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId);
  Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId);                               // NOT_ENOUGH_QUESTIONS; thứ tự gốc, Content không đảo
  Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId);
  Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey);
  Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId);                       // không đáp án
  Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer);
  Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId); // trả storageKey nếu được phép
  Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items); // DRAFT, origin=AI, idempotent (aiJobId,itemNo)
  Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards);     // Block vào bản làm việc, ai_review_status=PENDING
  Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId);               // chỉ chủ khóa
}
```
Gọi ra: Course `GetCourseAccess`, `CheckChapterAccess`; Assessment `GetQuestionUsageStats`.
Event phát (không Outbox): `ChapterPublished {chapterId, courseId, versionNo, isFirstPublish, addedBlockIds[], removedBlockIds[]}`, `ChapterDeleted {chapterId, courseId, wasPublished}`. Tiêu thụ: `CoursePermanentlyDeleted`.
Snapshot chương chỉ chứa `questionId`, KHÔNG nội dung/đáp án.
Contract Version: 1