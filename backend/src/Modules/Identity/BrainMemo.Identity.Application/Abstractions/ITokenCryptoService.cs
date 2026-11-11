namespace BrainMemo.Identity.Application.Abstractions;

/// <summary>
/// Generates opaque random tokens and computes fixed 32-byte SHA-256 hashes for persistence.
/// </summary>
public interface ITokenCryptoService
{
    string GenerateOpaqueToken();

    byte[] HashToken(string rawToken);
}

