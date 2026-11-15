using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.UnlockChapter;

public sealed class UnlockChapterCommandHandler(
    ICourseRepository courseRepository,
    IPasscodeHasher passcodeHasher,
    IPasscodeRateLimiter passcodeRateLimiter,
    IClock clock) : ICommandHandler<UnlockChapterCommand>
{
    public async Task<Result> Handle(UnlockChapterCommand request, CancellationToken ct)
    {
        if (passcodeRateLimiter.IsLocked(request.UserId, request.ChapterId))
        {
            return Result.Failure(new Error("TOO_MANY_REQUESTS", "Bạn đã nhập sai passcode quá nhiều lần. Vui lòng thử lại sau 15 phút."));
        }

        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted || course.IsHidden || course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        // Owner does not need to unlock
        if (course.OwnerUserId == request.UserId)
        {
            return Result.Success();
        }

        Enrollment? enrollment = await courseRepository.GetEnrollmentAsync(request.CourseId, request.UserId, ct).ConfigureAwait(false);
        if (enrollment is null || enrollment.Status != EnrollmentStatus.Active)
        {
            return Result.Failure(new Error("ENROLLMENT_REQUIRED", "Chỉ học viên đang học trong khóa học mới có thể mở khóa chương."));
        }

        ChapterAccess? chapterAccess = await courseRepository.GetChapterAccessAsync(request.ChapterId, ct).ConfigureAwait(false);
        if (chapterAccess is null || chapterAccess.AccessMode == ChapterAccessMode.Public)
        {
            // Already public - no passcode needed
            return Result.Success();
        }

        if (string.IsNullOrWhiteSpace(request.Passcode)
            || !passcodeHasher.Verify(request.Passcode.Trim(), chapterAccess.PasscodeHash ?? string.Empty))
        {
            passcodeRateLimiter.RecordFailedAttempt(request.UserId, request.ChapterId);
            return Result.Failure(new Error("INVALID_PASSCODE", "Passcode không chính xác."));
        }

        passcodeRateLimiter.Reset(request.UserId, request.ChapterId);

        DateTimeOffset now = clock.UtcNow;
        ChapterUnlock? existingUnlock = await courseRepository.GetChapterUnlockAsync(request.ChapterId, request.UserId, ct).ConfigureAwait(false);

        if (existingUnlock is not null)
        {
            existingUnlock.Update(chapterAccess.PasscodeVersion, now);
        }
        else
        {
            ChapterUnlock newUnlock = new(
                request.ChapterId,
                request.UserId,
                chapterAccess.PasscodeVersion,
                now);

            await courseRepository.AddChapterUnlockAsync(newUnlock, ct).ConfigureAwait(false);
        }

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
