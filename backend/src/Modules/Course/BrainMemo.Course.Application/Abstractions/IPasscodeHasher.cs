namespace BrainMemo.Course.Application.Abstractions;

public interface IPasscodeHasher
{
    string Hash(string passcode);
    bool Verify(string passcode, string passcodeHash);
}
