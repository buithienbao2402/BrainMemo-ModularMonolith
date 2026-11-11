namespace BrainMemo.WebApi.Options;

public sealed class CorsOptions
{
    public const string SectionName = "Cors";
    public const string PolicyName = "BrainMemoCors";

    public string AllowedOrigins { get; init; } = "http://localhost:5173";

    public string[] GetOrigins()
        => AllowedOrigins
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
}

