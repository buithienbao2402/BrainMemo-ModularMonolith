using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.GetCourseStats;

public sealed class GetCourseStatsQueryHandler(ICourseRepository courseRepository) : IQueryHandler<GetCourseStatsQuery, CourseStatsDto>
{
    public async Task<Result<CourseStatsDto>> Handle(GetCourseStatsQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure<CourseStatsDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure<CourseStatsDto>(Error.Forbidden("Chỉ chủ khóa mới có quyền xem thống kê."));
        }

        CourseStatsDto stats = await courseRepository.GetCourseStatsAsync(request.CourseId, ct).ConfigureAwait(false);
        return Result.Success(stats);
    }
}
