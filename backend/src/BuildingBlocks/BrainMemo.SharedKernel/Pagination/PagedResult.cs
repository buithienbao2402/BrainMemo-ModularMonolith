namespace BrainMemo.SharedKernel.Pagination;

/// <summary>
/// Standard offset-paginated response aligned with contracts/README.md §1 and openapi.root.yaml PageInfo.
/// </summary>
public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long TotalItems)
{
    public long Total => TotalItems;

    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalItems / (double)PageSize);

    public bool HasPreviousPage => Page > 1;

    public bool HasNextPage => Page < TotalPages;

    public PagedResult<TOut> Map<TOut>(Func<T, TOut> mapper)
    {
        ArgumentNullException.ThrowIfNull(mapper);
        IReadOnlyList<TOut> mapped = Items.Select(mapper).ToArray();
        return new PagedResult<TOut>(mapped, Page, PageSize, TotalItems);
    }

    public static PagedResult<T> Empty(
        int page = PagingConstants.DefaultPage,
        int pageSize = PagingConstants.DefaultPageSize)
    {
        PageRequest normalized = new PageRequest(page, pageSize).Normalize();
        return new PagedResult<T>([], normalized.Page, normalized.PageSize, 0);
    }
}
