using BrainMemo.SharedKernel.Pagination;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.BuildingBlocks.Infrastructure.Pagination;

/// <summary>
/// Queryable and collection helpers enforcing BrainMemo pagination bounds (pageSize <= 50).
/// </summary>
public static class QueryablePagingExtensions
{
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PageRequest request,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(request);

        PageRequest normalized = request.Normalize();
        long totalItems = await query.LongCountAsync(ct).ConfigureAwait(false);

        if (totalItems == 0)
        {
            return new PagedResult<T>([], normalized.Page, normalized.PageSize, 0);
        }

        List<T> items = await query
            .Skip(normalized.Skip)
            .Take(normalized.PageSize)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new PagedResult<T>(items, normalized.Page, normalized.PageSize, totalItems);
    }

    public static PagedResult<T> ToPagedResult<T>(
        this IEnumerable<T> source,
        PageRequest request)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(request);

        PageRequest normalized = request.Normalize();
        IReadOnlyCollection<T> material = source as IReadOnlyCollection<T> ?? source.ToList();
        long totalItems = material.Count;

        if (totalItems == 0)
        {
            return new PagedResult<T>([], normalized.Page, normalized.PageSize, 0);
        }

        List<T> items = material
            .Skip(normalized.Skip)
            .Take(normalized.PageSize)
            .ToList();

        return new PagedResult<T>(items, normalized.Page, normalized.PageSize, totalItems);
    }

    public static async Task<Page<T>> ToPageAsync<T>(
        this IQueryable<T> orderedQuery,
        int pageSize,
        Func<T, Guid> idSelector,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(orderedQuery);
        ArgumentNullException.ThrowIfNull(idSelector);

        int normalizedSize = new CursorPageRequest(null, pageSize).Normalize().PageSize;
        List<T> fetched = await orderedQuery
            .Take(normalizedSize + 1)
            .ToListAsync(ct)
            .ConfigureAwait(false);

        bool hasMore = fetched.Count > normalizedSize;
        if (hasMore)
        {
            fetched.RemoveAt(fetched.Count - 1);
        }

        Guid? afterId = fetched.Count > 0 ? idSelector(fetched[^1]) : null;
        return new Page<T>(fetched, afterId, hasMore);
    }

    public static Page<T> ToPage<T>(
        this IEnumerable<T> orderedSource,
        int pageSize,
        Func<T, Guid> idSelector)
    {
        ArgumentNullException.ThrowIfNull(orderedSource);
        ArgumentNullException.ThrowIfNull(idSelector);

        int normalizedSize = new CursorPageRequest(null, pageSize).Normalize().PageSize;
        List<T> fetched = orderedSource.Take(normalizedSize + 1).ToList();

        bool hasMore = fetched.Count > normalizedSize;
        if (hasMore)
        {
            fetched.RemoveAt(fetched.Count - 1);
        }

        Guid? afterId = fetched.Count > 0 ? idSelector(fetched[^1]) : null;
        return new Page<T>(fetched, afterId, hasMore);
    }
}
