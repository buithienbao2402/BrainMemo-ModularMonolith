using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.GetChapterAccess;

public sealed class GetChapterAccessConfigQueryHandler(
    ICourseRepository courseRepository) : IQueryHandler<GetChapterAccessConfigQuery, ChapterAccessConfigDto>
{
    public async Task<Result<ChapterAccessConfigDto>> Handle(GetChapterAccessConfigQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure<ChapterAccessConfigDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        ChapterAccess? chapterAccess = await courseRepository.GetChapterAccessAsync(request.ChapterId, ct).ConfigureAwait(false);
        if (chapterAccess is null)
        {
            return Result.Success(new ChapterAccessConfigDto("PUBLIC", 0));
        }

        return Result.Success(new ChapterAccessConfigDto(
            chapterAccess.AccessMode.ToString().ToUpperInvariant(),
            chapterAccess.PasscodeVersion));
    }
}
