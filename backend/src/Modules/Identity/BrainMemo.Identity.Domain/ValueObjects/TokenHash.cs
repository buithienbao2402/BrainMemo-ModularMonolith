using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.ValueObjects;

/// <summary>
/// 32-byte SHA-256 hash stored as <c>BINARY(32)</c> for refresh tokens and one-time user tokens.
/// </summary>
public sealed class TokenHash : ValueObject
{
    public const int ExpectedByteLength = 32;

    private readonly byte[] _bytes;

    private TokenHash(byte[] bytes)
    {
        _bytes = bytes;
    }

    public ReadOnlySpan<byte> AsSpan() => _bytes;

    public byte[] ToArray() => (byte[])_bytes.Clone();

    public static Result<TokenHash> Create(byte[]? hashBytes)
    {
        if (hashBytes is null || hashBytes.Length != ExpectedByteLength)
        {
            return Error.Validation($"Token hash phải có đúng {ExpectedByteLength} byte.");
        }

        return Result.Success(new TokenHash((byte[])hashBytes.Clone()));
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        foreach (byte value in _bytes)
        {
            yield return value;
        }
    }
}

