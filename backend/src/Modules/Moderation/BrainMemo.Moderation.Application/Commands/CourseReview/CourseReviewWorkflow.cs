using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Moderation.Application.Commands.CourseReview;

public sealed record ListCourseReviewQueueQuery(
    string? Status,
    int Page,
    int PageSize) : IRequest<Result<PagedListResponse<CourseReviewQueueItemDto>>>;

public sealed record ApproveCoursePublishCommand(
    Guid CourseId,
    Guid AdminUserId) : IRequest<Result>;

public sealed record RejectCoursePublishCommand(
    Guid CourseId,
    Guid AdminUserId,
    string Reason) : IRequest<Result>;

public sealed class CourseReviewWorkflowHandler(
    ICourseContract courseContract,
    IModerationRepository moderationRepository,
    IClock clock,
    IProfileContract? profileContract = null)
    : IRequestHandler<ListCourseReviewQueueQuery, Result<PagedListResponse<CourseReviewQueueItemDto>>>,
      IRequestHandler<ApproveCoursePublishCommand, Result>,
      IRequestHandler<RejectCoursePublishCommand, Result>
{
    public async Task<Result<PagedListResponse<CourseReviewQueueItemDto>>> Handle(
        ListCourseReviewQueueQuery request,
        CancellationToken ct)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 50);

        Result<PagedResult<CourseReviewQueueItemDto>> queueResult = courseContract.ListCourseReviewQueue(request.Status, page, pageSize);
        if (queueResult.IsFailure)
        {
            return Result.Failure<PagedListResponse<CourseReviewQueueItemDto>>(queueResult.Error);
        }

        List<CourseReviewQueueItemDto> enrichedItems = new(queueResult.Value.Items.Count);
        foreach (CourseReviewQueueItemDto item in queueResult.Value.Items)
        {
            BrainMemo.Course.Contracts.Dtos.UserRefDto owner = item.Owner;
            if (profileContract != null)
            {
                Result<PublicProfileDto> prof = await profileContract.GetPublicProfile(item.Owner.Id, ct).ConfigureAwait(false);
                if (prof.IsSuccess && !string.IsNullOrWhiteSpace(prof.Value.DisplayName))
                {
                    owner = new BrainMemo.Course.Contracts.Dtos.UserRefDto(
                        item.Owner.Id,
                        prof.Value.DisplayName,
                        prof.Value.AvatarUrl);
                }
            }

            enrichedItems.Add(item with { Owner = owner });
        }

        int total = (int)queueResult.Value.TotalItems;
        int totalPages = (int)Math.Ceiling((double)total / pageSize);

        return Result.Success(new PagedListResponse<CourseReviewQueueItemDto>(
            enrichedItems,
            new PageMetaDto(page, pageSize, total, totalPages)));
    }

    public async Task<Result> Handle(ApproveCoursePublishCommand request, CancellationToken ct)
    {
        Result result = courseContract.ApproveCoursePublish(request.CourseId, request.AdminUserId);
        if (result.IsFailure)
        {
            return result;
        }

        Result<AuditLog> logResult = AuditLog.Create(
            Guid.NewGuid(),
            AuditActorType.Admin,
            request.AdminUserId,
            AuditAction.CoursePublishApproved,
            AuditObjectType.Course,
            request.CourseId,
            null,
            "Phê duyệt xuất bản khóa học",
            null,
            null,
            null,
            clock.UtcNow);

        if (logResult.IsSuccess)
        {
            await moderationRepository.AddAuditLogAsync(logResult.Value, ct).ConfigureAwait(false);
            await moderationRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        return Result.Success();
    }

    public async Task<Result> Handle(RejectCoursePublishCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return Result.Failure(Error.Validation("Vui lòng nhập lý do từ chối."));
        }

        Result result = courseContract.RejectCoursePublish(request.CourseId, request.AdminUserId, request.Reason);
        if (result.IsFailure)
        {
            return result;
        }

        Result<AuditLog> logResult = AuditLog.Create(
            Guid.NewGuid(),
            AuditActorType.Admin,
            request.AdminUserId,
            AuditAction.CoursePublishRejected,
            AuditObjectType.Course,
            request.CourseId,
            null,
            request.Reason.Trim(),
            null,
            null,
            null,
            clock.UtcNow);

        if (logResult.IsSuccess)
        {
            await moderationRepository.AddAuditLogAsync(logResult.Value, ct).ConfigureAwait(false);
            await moderationRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        return Result.Success();
    }
}
