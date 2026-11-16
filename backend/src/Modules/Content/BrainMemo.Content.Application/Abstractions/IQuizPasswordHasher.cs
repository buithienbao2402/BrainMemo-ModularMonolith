namespace BrainMemo.Content.Application.Abstractions;

public interface IQuizPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string passwordHash);
}
