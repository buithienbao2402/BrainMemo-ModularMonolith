using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Pagination;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Learning.Infrastructure.Persistence;

public sealed class LearningRepository(LearningDbContext dbContext) : ILearningRepository
{
    public async Task<BlockCompletion?> GetBlockCompletionAsync(Guid userId, Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.BlockCompletions
            .FirstOrDefaultAsync(c => c.UserId == userId && c.BlockId == blockId, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<BlockCompletion>> ListBlockCompletionsAsync(Guid userId, Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.BlockCompletions
            .Where(c => c.UserId == userId && c.CourseId == courseId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<BlockCompletion>> ListBlockCompletionsForChapterAsync(Guid userId, Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.BlockCompletions
            .Where(c => c.UserId == userId && c.ChapterId == chapterId)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddBlockCompletionAsync(BlockCompletion completion, CancellationToken ct = default)
    {
        await dbContext.BlockCompletions.AddAsync(completion, ct).ConfigureAwait(false);
    }

    public async Task<CourseCompletion?> GetCourseCompletionAsync(Guid userId, Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.CourseCompletions
            .FirstOrDefaultAsync(c => c.UserId == userId && c.CourseId == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddCourseCompletionAsync(CourseCompletion completion, CancellationToken ct = default)
    {
        await dbContext.CourseCompletions.AddAsync(completion, ct).ConfigureAwait(false);
    }

    public async Task<Bookmark?> GetBookmarkAsync(Guid userId, Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Bookmarks
            .FirstOrDefaultAsync(b => b.UserId == userId && b.CourseId == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddBookmarkAsync(Bookmark bookmark, CancellationToken ct = default)
    {
        await dbContext.Bookmarks.AddAsync(bookmark, ct).ConfigureAwait(false);
    }

    public Task RemoveBookmarkAsync(Bookmark bookmark, CancellationToken ct = default)
    {
        dbContext.Bookmarks.Remove(bookmark);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<Bookmark>> ListBookmarksAsync(Guid userId, CancellationToken ct = default)
    {
        return await dbContext.Bookmarks
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.UpdatedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountCourseCompletionsAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.CourseCompletions
            .CountAsync(c => c.CourseId == courseId, ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountChapterCompletionsAsync(Guid chapterId, CancellationToken ct = default)
    {
        // Counts distinct users who completed all blocks in this chapter
        return await dbContext.BlockCompletions
            .Where(c => c.ChapterId == chapterId)
            .Select(c => c.UserId)
            .Distinct()
            .CountAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<Page<Guid>> ListInProgressCourseIdsAsync(Guid userId, Guid? afterId, int limit, CancellationToken ct = default)
    {
        // Active courses where user completed at least 1 block but has not yet completed the course
        IQueryable<Guid> completedCourseIds = dbContext.CourseCompletions
            .Where(c => c.UserId == userId)
            .Select(c => c.CourseId);

        IQueryable<Guid> query = dbContext.BlockCompletions
            .Where(c => c.UserId == userId && !completedCourseIds.Contains(c.CourseId))
            .Select(c => c.CourseId)
            .Distinct();

        if (afterId.HasValue)
        {
            query = query.Where(id => id.CompareTo(afterId.Value) > 0);
        }

        List<Guid> items = await query
            .OrderBy(id => id)
            .Take(limit + 1)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        bool hasMore = items.Count > limit;
        if (hasMore)
        {
            items.RemoveAt(items.Count - 1);
        }

        Guid? lastId = items.Count > 0 ? items[^1] : null;
        return new Page<Guid>(items, lastId, hasMore);
    }

    public async Task<Comment?> GetCommentByIdAsync(Guid commentId, CancellationToken ct = default)
    {
        return await dbContext.Comments
            .Include(c => c.Replies)
            .FirstOrDefaultAsync(c => c.Id == commentId, ct)
            .ConfigureAwait(false);
    }

    public async Task AddCommentAsync(Comment comment, CancellationToken ct = default)
    {
        await dbContext.Comments.AddAsync(comment, ct).ConfigureAwait(false);
    }

    public async Task<PagedResult<Comment>> ListRootCommentsAsync(
        Guid courseId,
        Guid? chapterId,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        IQueryable<Comment> query = dbContext.Comments
            .AsNoTracking()
            .Where(c => c.CourseId == courseId && c.ParentCommentId == null && c.DeletedAt == null);

        if (chapterId.HasValue)
        {
            query = query.Where(c => c.ChapterId == chapterId.Value);
        }

        int totalItems = await query.CountAsync(ct).ConfigureAwait(false);

        List<Comment> items = await query
            .OrderByDescending(c => c.IsPinned)
            .ThenByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<Comment>(items, page, pageSize, totalItems);
    }

    public async Task<IReadOnlyList<Comment>> ListRepliesForParentsAsync(
        IReadOnlyList<Guid> parentCommentIds,
        CancellationToken ct = default)
    {
        if (parentCommentIds.Count == 0)
        {
            return Array.Empty<Comment>();
        }

        return await dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ParentCommentId != null && parentCommentIds.Contains(c.ParentCommentId.Value) && c.DeletedAt == null)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<int> CountCommentsAsync(Guid courseId, Guid? chapterId = null, CancellationToken ct = default)
    {
        IQueryable<Comment> query = dbContext.Comments
            .Where(c => c.CourseId == courseId && c.DeletedAt == null);

        if (chapterId.HasValue)
        {
            query = query.Where(c => c.ChapterId == chapterId.Value);
        }

        return await query.CountAsync(ct).ConfigureAwait(false);
    }

    public async Task<int> CountRootCommentsAsync(Guid courseId, Guid? chapterId = null, CancellationToken ct = default)
    {
        IQueryable<Comment> query = dbContext.Comments
            .Where(c => c.CourseId == courseId && c.ParentCommentId == null && c.DeletedAt == null);

        if (chapterId.HasValue)
        {
            query = query.Where(c => c.ChapterId == chapterId.Value);
        }

        return await query.CountAsync(ct).ConfigureAwait(false);
    }

    public async Task<int> CountPinnedCommentsAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Comments
            .Where(c => c.CourseId == courseId && c.IsPinned && c.DeletedAt == null)
            .CountAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await dbContext.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
