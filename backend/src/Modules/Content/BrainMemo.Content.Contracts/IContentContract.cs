using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Contracts;

public interface IContentContract
{
    Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds);
    Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId);
    Result<int> CountPublishedChapters(Guid courseId);
    Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId);
    Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit);
    Result<PublishedBlockRef> GetPublishedBlock(Guid blockId);
    Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId);
    Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId);
    Result VerifyQuizPassword(Guid quizBlockId, string password);
    Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId);
    Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId);
    Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId);
    Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey);
    Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId);
    Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer);
    Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId);
    Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items);
    Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards);
    Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId);
}
