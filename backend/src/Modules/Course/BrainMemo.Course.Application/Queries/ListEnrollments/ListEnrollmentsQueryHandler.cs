using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.ListEnrollments;

public sealed class ListEnrollmentsQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract = null) : IQueryHandler<ListEnrollmentsQuery, PagedResult<EnrollmentDto>>
{
    public async Task<Result<PagedResult<EnrollmentDto>>> Handle(ListEnrollmentsQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure<PagedResult<EnrollmentDto>>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure<PagedResult<EnrollmentDto>>(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền xem danh sách học viên."));
        }

        EnrollmentStatus? filterStatus = null;
        if (!string.IsNullOrWhiteSpace(request.Status)
            && Enum.TryParse(request.Status.Trim(), true, out EnrollmentStatus parsedStatus))
        {
            filterStatus = parsedStatus;
        }

        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 50);

        PagedResult<Enrollment> pagedEnrollments = await courseRepository.ListEnrollmentsPagedAsync(
            request.CourseId,
            filterStatus,
            page,
            pageSize,
            ct).ConfigureAwait(false);

        List<Guid> userIds = pagedEnrollments.Items.Select(e => e.UserId).Distinct().ToList();
        Dictionary<Guid, DisplayInfoDto> displayMap = [];

        if (userIds.Count > 0 && profileContract is not null)
        {
            Result<IReadOnlyList<DisplayInfoDto>> displayResult = await profileContract.GetDisplayInfo(userIds, ct).ConfigureAwait(false);
            if (displayResult.IsSuccess)
            {
                displayMap = displayResult.Value.ToDictionary(u => u.UserId);
            }
        }

        List<EnrollmentDto> dtos = pagedEnrollments.Items.Select(e =>
        {
            displayMap.TryGetValue(e.UserId, out DisplayInfoDto? u);
            UserRefDto userRef = u is not null
                ? new UserRefDto(u.UserId, u.DisplayName, u.AvatarUrl)
                : new UserRefDto(e.UserId, "Người dùng");

            return new EnrollmentDto(
                e.Id,
                e.CourseId,
                userRef,
                e.Status.ToStatusString(),
                null,
                e.StatusChangedAt);
        }).ToList();

        return Result.Success(new PagedResult<EnrollmentDto>(dtos, page, pageSize, pagedEnrollments.TotalItems));
    }
}
