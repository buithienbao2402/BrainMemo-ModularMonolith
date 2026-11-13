namespace BrainMemo.Content.Domain.Entities;

public class AssignmentConfig
{
    private AssignmentConfig() { }

    public AssignmentConfig(
        Guid blockId,
        DateTimeOffset? dueAt = null,
        decimal? maxPoints = null,
        uint maxFileSizeBytes = 20971520)
    {
        BlockId = blockId;
        DueAt = dueAt;
        MaxPoints = maxPoints;
        MaxFileSizeBytes = maxFileSizeBytes;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public Guid BlockId { get; private set; }
    public DateTimeOffset? DueAt { get; private set; }
    public decimal? MaxPoints { get; private set; }
    public uint MaxFileSizeBytes { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        DateTimeOffset? dueAt,
        decimal? maxPoints,
        uint maxFileSizeBytes)
    {
        DueAt = dueAt;
        MaxPoints = maxPoints;
        MaxFileSizeBytes = maxFileSizeBytes;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
