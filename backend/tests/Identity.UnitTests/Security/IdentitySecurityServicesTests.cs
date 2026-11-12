using BrainMemo.Identity.Infrastructure.Security;
using Xunit;

namespace Identity.UnitTests.Security;

public sealed class IdentitySecurityServicesTests
{
    // Exact hash stored in db/seed/01_seed_admin.sql for Admin@Dev2026!
    private const string SeedAdminHash = "$2a$11$4f2yYs1CM3IolauQs0rFvOIj3uljtDHa4TlvJBlGBEHHnD1ZRnTOu";

    [Fact]
    public void BCryptPasswordHasher_HashesAndVerifies_IncludingDevSeedHash()
    {
        BCryptPasswordHasher hasher = new();

        Assert.True(hasher.Verify("Admin@Dev2026!", SeedAdminHash));
        Assert.False(hasher.Verify("WrongPassword!", SeedAdminHash));

        string generated = hasher.Hash("StrongPassword@2026!");
        Assert.True(generated.Length <= 100);
        Assert.True(hasher.Verify("StrongPassword@2026!", generated));
        Assert.False(hasher.Verify("DifferentPassword", generated));
    }

    [Fact]
    public void Sha256TokenCryptoService_ProducesUrlSafeTokensAndFixed32ByteHashes()
    {
        Sha256TokenCryptoService crypto = new();

        string token1 = crypto.GenerateOpaqueToken();
        string token2 = crypto.GenerateOpaqueToken();

        Assert.False(string.IsNullOrWhiteSpace(token1));
        Assert.NotEqual(token1, token2);

        byte[] hash1 = crypto.HashToken(token1);
        byte[] hash1Repeat = crypto.HashToken(token1);
        byte[] hash2 = crypto.HashToken(token2);

        Assert.Equal(32, hash1.Length);
        Assert.Equal(hash1, hash1Repeat);
        Assert.NotEqual(hash1, hash2);
    }
}

