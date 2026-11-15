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

    Task SaveChangesAsync(CancellationToken ct = default);
}
