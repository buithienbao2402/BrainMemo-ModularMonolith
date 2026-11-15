using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Commands.SetChapterAccess;

public sealed class SetChapterAccessCommandHandler(
    ICourseRepository courseRepository,
    IContentContract contentContract,
    IPasscodeHasher passcodeHasher,
    IClock clock) : ICommandHandler<SetChapterAccessCommand>
{
    public async Task<Result> Handle(SetChapterAccessCommand request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền cấu hình quyền truy cập chương."));
        }

        Result<IReadOnlyList<ChapterInfoDto>> chapterInfoResult = contentContract.GetChapterInfo([request.ChapterId]);
        if (chapterInfoResult.IsFailure || chapterInfoResult.Value.Count == 0 || chapterInfoResult.Value[0].CourseId != request.CourseId)
        {
            return Result.Failure(new Error("CHAPTER_NOT_FOUND", "Chương không tồn tại hoặc không thuộc khóa học này."));
        }

        string modeUpper = request.AccessMode.Trim().ToUpperInvariant();
        ChapterAccessMode mode;
        string? passcodeHash = null;

        if (modeUpper == "PROTECTED")
        {
            mode = ChapterAccessMode.Protected;
            if (string.IsNullOrWhiteSpace(request.Passcode) || request.Passcode.Trim().Length < 4)
            {
                return Result.Failure(new Error("INVALID_PASSCODE", "Passcode cho chương Protected phải có tối thiểu 4 ký tự."));
            }

            passcodeHash = passcodeHasher.Hash(request.Passcode.Trim());
        }
        else if (modeUpper == "PUBLIC")
        {
            mode = ChapterAccessMode.Public;
        }
        else
        {
            return Result.Failure(new Error("INVALID_ACCESS_MODE", "Chế độ truy cập chương không hợp lệ. Chỉ chấp nhận PUBLIC hoặc PROTECTED."));
        }

        DateTimeOffset now = clock.UtcNow;
        ChapterAccess? chapterAccess = await courseRepository.GetChapterAccessAsync(request.ChapterId, ct).ConfigureAwait(false);

        if (chapterAccess is null)
        {
            ChapterAccess newAccess = new(
                request.ChapterId,
                request.CourseId,
                mode,
                passcodeHash,
                passcodeVersion: 1,
                now);

            await courseRepository.AddChapterAccessAsync(newAccess, ct).ConfigureAwait(false);
        }
        else
        {
            chapterAccess.UpdateAccess(mode, passcodeHash, now);
        }

        await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
