using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using BrainMemo.Identity.Application.Abstractions;

namespace BrainMemo.Identity.Infrastructure.Security;

/// <summary>
/// Generates 256-bit cryptographically random URL-safe tokens and computes SHA-256 32-byte digests.
/// </summary>
internal sealed class Sha256TokenCryptoService : ITokenCryptoService
{
    private const int TokenByteLength = 32;

    public string GenerateOpaqueToken()
    {
        Span<byte> randomBytes = stackalloc byte[TokenByteLength];
        RandomNumberGenerator.Fill(randomBytes);
        return Base64Url.EncodeToString(randomBytes);
    }

    public byte[] HashToken(string rawToken)
    {
        ArgumentException.ThrowIfNullOrEmpty(rawToken);
        return SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
    }
}
