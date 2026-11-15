using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.ListEnrollmentRequests;

public sealed class ListEnrollmentRequestsQueryHandler(
    ICourseRepository courseRepository,
    IProfileContract? profileContract = null) : IQueryHandler<ListEnrollmentRequestsQuery, PagedResult<EnrollmentRequestDto>>
{
    public async Task<Result<PagedResult<EnrollmentRequestDto>>> Handle(ListEnrollmentRequestsQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure<PagedResult<EnrollmentRequestDto>>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure<PagedResult<EnrollmentRequestDto>>(Error.Forbidden("Chỉ chủ sở hữu khóa học mới có quyền xem danh sách yêu cầu ghi danh."));
        }

        EnrollmentDecision? filterDecision = null;
        if (!string.IsNullOrWhiteSpace(request.Decision)
            && Enum.TryParse(request.Decision.Trim(), true, out EnrollmentDecision parsedDecision))
        {
            filterDecision = parsedDecision;
        }

        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 50);

        PagedResult<EnrollmentRequest> pagedRequests = await courseRepository.ListEnrollmentRequestsPagedAsync(
            request.CourseId,
            filterDecision,
            page,
            pageSize,
            ct).ConfigureAwait(false);

        List<Guid> userIds = pagedRequests.Items.Select(r => r.UserId).Distinct().ToList();
        Dictionary<Guid, DisplayInfoDto> displayMap = [];

        if (userIds.Count > 0 && profileContract is not null)
        {
            Result<IReadOnlyList<DisplayInfoDto>> displayResult = await profileContract.GetDisplayInfo(userIds, ct).ConfigureAwait(false);
            if (displayResult.IsSuccess)
            {
                displayMap = displayResult.Value.ToDictionary(u => u.UserId);
            }
        }

        List<EnrollmentRequestDto> dtos = pagedRequests.Items.Select(r =>
        {
            displayMap.TryGetValue(r.UserId, out DisplayInfoDto? u);
            UserRefDto userRef = u is not null
                ? new UserRefDto(u.UserId, u.DisplayName, u.AvatarUrl)
                : new UserRefDto(r.UserId, "Người dùng");

            return new EnrollmentRequestDto(
                r.Id,
                r.CourseId,
                userRef,
                r.Decision.ToString().ToUpperInvariant(),
                r.RequestedAt,
                r.DecidedAt,
                r.DecidedByUserId);
        }).ToList();

        return Result.Success(new PagedResult<EnrollmentRequestDto>(dtos, page, pageSize, pagedRequests.TotalItems));
    }
}
