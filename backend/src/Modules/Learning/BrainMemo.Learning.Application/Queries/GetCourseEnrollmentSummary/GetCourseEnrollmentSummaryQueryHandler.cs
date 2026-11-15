using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetCourseEnrollmentSummary;

public sealed class GetCourseEnrollmentSummaryQueryHandler(
    ICourseContract courseContract,
    ILearningRepository learningRepository) : IQueryHandler<GetCourseEnrollmentSummaryQuery, CourseEnrollmentSummaryDto>
{
    public async Task<Result<CourseEnrollmentSummaryDto>> Handle(GetCourseEnrollmentSummaryQuery request, CancellationToken ct)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(request.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<CourseEnrollmentSummaryDto>(accessResult.Error);
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<CourseEnrollmentSummaryDto>(Error.Forbidden("Chỉ chủ khóa mới có quyền xem thống kê học tập."));
        }

        int completedLearners = await learningRepository
            .CountCourseCompletionsAsync(request.CourseId, ct)
            .ConfigureAwait(false);

        // Get learners from course contract facts
        Result<BrainMemo.SharedKernel.Pagination.Page<Guid>> activeLearners = courseContract.ListActiveLearnerIds(request.CourseId, null, 1000);
        int activeCount = activeLearners.IsSuccess ? activeLearners.Value.Items.Count : 0;

        return Result.Success(new CourseEnrollmentSummaryDto(
            CourseId: request.CourseId,
            TotalLearners: activeCount,
            ActiveLearners: activeCount,
            CompletedLearners: completedLearners,
            PendingApprovalCount: 0,
            InvitedCount: 0,
            LeftCount: 0,
            RemovedCount: 0));
    }
}
