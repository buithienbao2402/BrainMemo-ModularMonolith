namespace BrainMemo.Identity.Application.Abstractions;

/// <summary>
/// Hashes and verifies plaintext passwords using BCrypt (THIET_KE_CSDL §3.1.6 / AGENT.md §4.5).
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}

