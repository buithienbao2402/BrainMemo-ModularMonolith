namespace BrainMemo.Discovery.Domain.Entities;

public sealed class SearchHistory
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string QueryText { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
