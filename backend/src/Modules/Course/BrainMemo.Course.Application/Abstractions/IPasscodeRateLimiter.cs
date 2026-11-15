namespace BrainMemo.Course.Application.Abstractions;

public interface IPasscodeRateLimiter
{
    bool IsLocked(Guid userId, Guid chapterId);
    void RecordFailedAttempt(Guid userId, Guid chapterId);
    void Reset(Guid userId, Guid chapterId);
}
