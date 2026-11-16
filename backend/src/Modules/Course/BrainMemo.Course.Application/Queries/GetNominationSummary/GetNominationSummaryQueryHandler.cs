using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.GetNominationSummary;

public sealed class GetNominationSummaryQueryHandler(
    ICourseRepository courseRepository) : IQueryHandler<GetNominationSummaryQuery, NominationSummaryDto>
{
    public async Task<Result<NominationSummaryDto>> Handle(GetNominationSummaryQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null || course.IsDeleted)
        {
            return Result.Failure<NominationSummaryDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        int nominationCount = await courseRepository.GetNominationCountAsync(request.CourseId, ct).ConfigureAwait(false);
        bool hasNominated = request.CurrentUserId.HasValue
            && await courseRepository.HasNominatedAsync(request.CourseId, request.CurrentUserId.Value, ct).ConfigureAwait(false);

        return Result.Success(new NominationSummaryDto(nominationCount, hasNominated));
    }
}
