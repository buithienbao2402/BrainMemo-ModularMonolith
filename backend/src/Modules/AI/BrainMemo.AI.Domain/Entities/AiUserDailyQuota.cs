using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.AI.Domain.Entities;

public sealed class AiUserDailyQuota : Entity
{
    private AiUserDailyQuota() { }

    public AiUserDailyQuota(
        Guid id,
        Guid userId,
        DateOnly quotaDate,
        int quotaLimit,
        int usedCount = 0)
        : base(id)
    {
        UserId = userId;
        QuotaDate = quotaDate;
        QuotaLimit = quotaLimit;
        UsedCount = usedCount;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid UserId { get; private set; }
    public DateOnly QuotaDate { get; private set; }
    public int UsedCount { get; private set; }
    public int QuotaLimit { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public bool TryIncrement()
    {
        if (UsedCount >= QuotaLimit)
        {
            return false;
        }

        UsedCount++;
        UpdatedAt = DateTimeOffset.UtcNow;
        return true;
    }

    public void UpdateLimit(int newLimit)
    {
        QuotaLimit = newLimit;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
