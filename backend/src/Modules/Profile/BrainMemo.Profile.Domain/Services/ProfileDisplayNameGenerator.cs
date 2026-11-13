namespace BrainMemo.Profile.Domain.Services;

public static class ProfileDisplayNameGenerator
{
    public const string DefaultPrefix = "Người dùng ";

    public static string GenerateDefault(Guid userId)
    {
        string hex = userId.ToString("N");
        string random6 = hex[^6..].ToUpperInvariant();
        return $"{DefaultPrefix}{random6}";
    }
}
