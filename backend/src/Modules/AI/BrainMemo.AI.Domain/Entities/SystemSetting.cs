namespace BrainMemo.AI.Domain.Entities;

public sealed class SystemSetting
{
    public SystemSetting(string key, string value, Guid? updatedBy = null)
    {
        Key = key;
        Value = value;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    private SystemSetting() { }

    public string Key { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public Guid? UpdatedBy { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void UpdateValue(string value, Guid? updatedBy)
    {
        Value = value;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
