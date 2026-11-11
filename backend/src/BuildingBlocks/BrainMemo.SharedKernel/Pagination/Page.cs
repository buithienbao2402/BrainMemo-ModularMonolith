namespace BrainMemo.SharedKernel.Pagination;

/// <summary>
/// Cursor-paginated response slice (contracts/README.md §1).
/// </summary>
public sealed record Page<T>(
    IReadOnlyList<T> Items,
    Guid? AfterId,
    bool HasMore,
    string? Cursor = null)
{
    public Page<TOut> Map<TOut>(Func<T, TOut> mapper)
    {
        ArgumentNullException.ThrowIfNull(mapper);
        IReadOnlyList<TOut> mapped = Items.Select(mapper).ToArray();
        return new Page<TOut>(mapped, AfterId, HasMore, Cursor);
    }

    public static Page<T> Empty() => new([], null, false);
}
