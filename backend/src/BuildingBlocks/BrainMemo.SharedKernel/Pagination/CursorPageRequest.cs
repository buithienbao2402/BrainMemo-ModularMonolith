namespace BrainMemo.SharedKernel.Pagination;

/// <summary>
/// Cursor pagination request normalized to [1 <= pageSize <= 50].
/// </summary>
public sealed record CursorPageRequest(Guid? AfterId = null, int PageSize = PagingConstants.DefaultPageSize)
{
    public CursorPageRequest Normalize()
    {
        int normalizedSize = PageSize switch
        {
            < 1 => PagingConstants.DefaultPageSize,
            > PagingConstants.MaxPageSize => PagingConstants.MaxPageSize,
            _ => PageSize,
        };

        return new CursorPageRequest(AfterId, normalizedSize);
    }

    public static CursorPageRequest Create(Guid? afterId, int? pageSize)
        => new CursorPageRequest(afterId, pageSize ?? PagingConstants.DefaultPageSize).Normalize();
}
