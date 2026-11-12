namespace BrainMemo.Identity.Domain.Enums;

/// <summary>
/// External OAuth provider stored in <c>idn_external_identity.provider</c>.
/// </summary>
public enum ExternalProvider
{
    Google = 0,
}

public static class ExternalProviderExtensions
{
    public const string GoogleDbValue = "GOOGLE";

    public static string ToDatabaseValue(this ExternalProvider provider) => provider switch
    {
        ExternalProvider.Google => GoogleDbValue,
        _ => throw new ArgumentOutOfRangeException(nameof(provider), provider, null),
    };

    public static ExternalProvider ParseExternalProvider(string value) => value switch
    {
        GoogleDbValue => ExternalProvider.Google,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown external provider."),
    };
}

