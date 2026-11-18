using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Learning.Application.Abstractions;

public interface ILearningRepository
{
    Task<BlockCompletion?> GetBlockCompletionAsync(Guid userId, Guid blockId, CancellationToken ct = default);
    Task<IReadOnlyList<BlockCompletion>> ListBlockCompletionsAsync(Guid userId, Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<BlockCompletion>> ListBlockCompletionsForChapterAsync(Guid userId, Guid chapterId, CancellationToken ct = default);
    Task AddBlockCompletionAsync(BlockCompletion completion, CancellationToken ct = default);

    Task<CourseCompletion?> GetCourseCompletionAsync(Guid userId, Guid courseId, CancellationToken ct = default);
    Task AddCourseCompletionAsync(CourseCompletion completion, CancellationToken ct = default);

    Task<Bookmark?> GetBookmarkAsync(Guid userId, Guid courseId, CancellationToken ct = default);
    Task AddBookmarkAsync(Bookmark bookmark, CancellationToken ct = default);
    Task RemoveBookmarkAsync(Bookmark bookmark, CancellationToken ct = default);
    Task<IReadOnlyList<Bookmark>> ListBookmarksAsync(Guid userId, CancellationToken ct = default);

    Task<int> CountCourseCompletionsAsync(Guid courseId, CancellationToken ct = default);
    Task<int> CountChapterCompletionsAsync(Guid chapterId, CancellationToken ct = default);
    Task<Page<Guid>> ListInProgressCourseIdsAsync(Guid userId, Guid? afterId, int limit, CancellationToken ct = default);

    Task<Comment?> GetCommentByIdAsync(Guid commentId, CancellationToken ct = default);
    Task AddCommentAsync(Comment comment, CancellationToken ct = default);
    Task<PagedResult<Comment>> ListRootCommentsAsync(Guid courseId, Guid? chapterId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Comment>> ListRepliesForParentsAsync(IReadOnlyList<Guid> parentCommentIds, CancellationToken ct = default);
    Task<int> CountCommentsAsync(Guid courseId, Guid? chapterId = null, CancellationToken ct = default);
    Task<int> CountRootCommentsAsync(Guid courseId, Guid? chapterId = null, CancellationToken ct = default);
    Task<int> CountPinnedCommentsAsync(Guid courseId, CancellationToken ct = default);

    Task<QuizAttempt?> GetQuizAttemptByIdAsync(Guid attemptId, CancellationToken ct = default);
    Task<QuizAttempt?> GetActiveQuizAttemptAsync(Guid userId, Guid quizBlockId, CancellationToken ct = default);
    Task<int> CountQuizAttemptsAsync(Guid userId, Guid quizBlockId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizAttempt>> ListQuizAttemptsAsync(Guid userId, Guid quizBlockId, CancellationToken ct = default);
    Task AddQuizAttemptWithAnswersAsync(QuizAttempt attempt, IReadOnlyList<QuizAttemptAnswer> answers, CancellationToken ct = default);
    Task<IReadOnlyList<QuizAttemptAnswer>> GetQuizAttemptAnswersAsync(Guid attemptId, CancellationToken ct = default);
    Task<QuizAttemptAnswer?> GetQuizAttemptAnswerAsync(Guid attemptId, Guid questionId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizAttempt>> ListExpiredInProgressAttemptsAsync(DateTimeOffset now, CancellationToken ct = default);

    Task<AssignmentSubmission?> GetAssignmentSubmissionAsync(Guid userId, Guid assignmentBlockId, CancellationToken ct = default);
    Task<AssignmentSubmission?> GetAssignmentSubmissionByIdAsync(Guid submissionId, CancellationToken ct = default);
    Task<IReadOnlyList<AssignmentSubmission>> ListPendingAssignmentSubmissionsAsync(Guid courseId, CancellationToken ct = default);
    Task AddAssignmentSubmissionAsync(AssignmentSubmission submission, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
