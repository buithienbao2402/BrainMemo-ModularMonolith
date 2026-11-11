namespace BrainMemo.SharedKernel.Pagination;

/// <summary>
/// Shared pagination bounds aligned with DEC-20 and AGENT.md §4 (pageSize <= 50).
/// </summary>
public static class PagingConstants
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 50;
}
