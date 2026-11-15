using BrainMemo.Course.Application.Abstractions;

namespace BrainMemo.Course.Infrastructure.Security;

public sealed class BCryptPasscodeHasher : IPasscodeHasher
{
    private const int WorkFactor = 11;

    public string Hash(string passcode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passcode);
        return BCrypt.Net.BCrypt.HashPassword(passcode, WorkFactor);
    }

    public bool Verify(string passcode, string passcodeHash)
    {
        if (string.IsNullOrWhiteSpace(passcode) || string.IsNullOrWhiteSpace(passcodeHash))
        {
            return false;
        }

        try
        {
            return BCrypt.Net.BCrypt.Verify(passcode, passcodeHash);
        }
        catch
        {
            return false;
        }
    }
}
