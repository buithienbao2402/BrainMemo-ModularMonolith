namespace BrainMemo.SharedKernel.Pagination;

/// <summary>
/// Offset pagination request normalized to [page >= 1] and [1 <= pageSize <= 50].
/// </summary>
public sealed record PageRequest(int Page = PagingConstants.DefaultPage, int PageSize = PagingConstants.DefaultPageSize)
{
    public PageRequest Normalize()
    {
        int normalizedPage = Page < 1 ? PagingConstants.DefaultPage : Page;
        int normalizedSize = PageSize switch
        {
            < 1 => PagingConstants.DefaultPageSize,
            > PagingConstants.MaxPageSize => PagingConstants.MaxPageSize,
            _ => PageSize,
        };

        return new PageRequest(normalizedPage, normalizedSize);
    }

    public int Skip
    {
        get
        {
            PageRequest normalized = Normalize();
            long skip = (long)(normalized.Page - 1) * normalized.PageSize;
            return skip > int.MaxValue ? int.MaxValue : (int)skip;
        }
    }

    public static PageRequest Create(int? page, int? pageSize)
        => new PageRequest(page ?? PagingConstants.DefaultPage, pageSize ?? PagingConstants.DefaultPageSize).Normalize();
}
