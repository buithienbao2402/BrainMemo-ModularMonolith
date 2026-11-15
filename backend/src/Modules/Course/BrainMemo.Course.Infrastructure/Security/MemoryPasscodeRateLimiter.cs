using System.Collections.Concurrent;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Course.Infrastructure.Security;

public sealed class MemoryPasscodeRateLimiter(IClock clock) : IPasscodeRateLimiter
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    private readonly ConcurrentDictionary<(Guid UserId, Guid ChapterId), AttemptRecord> _attempts = new();

    public bool IsLocked(Guid userId, Guid chapterId)
    {
        DateTimeOffset now = clock.UtcNow;
        if (!_attempts.TryGetValue((userId, chapterId), out AttemptRecord? record))
        {
            return false;
        }

        if (record.LockedUntil.HasValue)
        {
            if (now < record.LockedUntil.Value)
            {
                return true;
            }

            // Expired lock
            _attempts.TryRemove((userId, chapterId), out _);
            return false;
        }

        // If window passed without lock, clean up
        if (now - record.FirstAttemptAt > LockoutDuration)
        {
            _attempts.TryRemove((userId, chapterId), out _);
            return false;
        }

        return false;
    }

    public void RecordFailedAttempt(Guid userId, Guid chapterId)
    {
        DateTimeOffset now = clock.UtcNow;
        _attempts.AddOrUpdate(
            (userId, chapterId),
            _ => new AttemptRecord(1, now, null),
            (_, existing) =>
            {
                if (existing.LockedUntil.HasValue && now < existing.LockedUntil.Value)
                {
                    return existing;
                }

                if (now - existing.FirstAttemptAt > LockoutDuration)
                {
                    return new AttemptRecord(1, now, null);
                }

                int newCount = existing.FailedCount + 1;
                DateTimeOffset? lockedUntil = newCount >= MaxFailedAttempts ? now.Add(LockoutDuration) : null;
                return new AttemptRecord(newCount, existing.FirstAttemptAt, lockedUntil);
            });
    }

    public void Reset(Guid userId, Guid chapterId)
    {
        _attempts.TryRemove((userId, chapterId), out _);
    }

    private sealed record AttemptRecord(int FailedCount, DateTimeOffset FirstAttemptAt, DateTimeOffset? LockedUntil);
}
