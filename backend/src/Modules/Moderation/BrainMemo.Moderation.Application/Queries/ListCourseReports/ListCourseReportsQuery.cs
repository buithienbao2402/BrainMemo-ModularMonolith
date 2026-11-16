using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.ListCourseReports;

public sealed record ListCourseReportsQuery(
    Guid CourseId,
    Guid CallerUserId,
    string? Status = null,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedListResponse<ReportDto>>>;

public sealed class ListCourseReportsQueryHandler(
    IModerationRepository repository,
    ICourseContract courseContract,
    IIdentityContract identityContract,
    IProfileContract profileContract) : IRequestHandler<ListCourseReportsQuery, Result<PagedListResponse<ReportDto>>>
{
    public async Task<Result<PagedListResponse<ReportDto>>> Handle(ListCourseReportsQuery query, CancellationToken ct)
    {
        var accessResult = courseContract.GetCourseAccess(query.CourseId, query.CallerUserId);
        bool isOwner = accessResult.IsSuccess && accessResult.Value.IsOwner;

        if (!isOwner)
        {
            var adminResult = await identityContract.IsAdmin(query.CallerUserId, ct).ConfigureAwait(false);
            bool isAdmin = adminResult.IsSuccess && adminResult.Value;
            if (!isAdmin)
            {
                return Error.Forbidden("Chỉ chủ khóa học hoặc quản trị viên mới có thể xem danh sách báo cáo của khóa học.");
            }
        }

        ReportStatus? status = null;
        if (!string.IsNullOrWhiteSpace(query.Status) && Enum.TryParse<ReportStatus>(query.Status, true, out var parsedStatus))
        {
            status = parsedStatus;
        }

        int page = Math.Max(1, query.Page);
        int pageSize = Math.Clamp(query.PageSize, 1, 50);

        PagedListResponse<Report> reports = await repository.ListReportsAsync(
            status,
            null,
            null,
            query.CourseId,
            page,
            pageSize,
            ct).ConfigureAwait(false);

        List<ReportDto> dtos = [];
        foreach (Report r in reports.Items)
        {
            dtos.Add(await MapToReportDtoAsync(r, ct).ConfigureAwait(false));
        }

        return Result.Success(new PagedListResponse<ReportDto>(dtos, reports.Meta));
    }

    private async Task<ReportDto> MapToReportDtoAsync(Report r, CancellationToken ct)
    {
        UserRefDto? reporterRef = null;
        if (r.ReporterUserId.HasValue)
        {
            var p = await profileContract.GetPublicProfile(r.ReporterUserId.Value, ct).ConfigureAwait(false);
            if (p.IsSuccess)
            {
                reporterRef = new UserRefDto(r.ReporterUserId.Value, null, p.Value.DisplayName, p.Value.AvatarUrl);
            }
        }

        UserRefDto? ownerRef = null;
        var ownerP = await profileContract.GetPublicProfile(r.TargetOwnerUserId, ct).ConfigureAwait(false);
        if (ownerP.IsSuccess)
        {
            ownerRef = new UserRefDto(r.TargetOwnerUserId, null, ownerP.Value.DisplayName, ownerP.Value.AvatarUrl);
        }

        var evDtos = r.Evidences.Select(e => new ReportEvidenceDto(
            e.Id,
            e.Kind.ToString().ToUpperInvariant(),
            e.StorageKey,
            e.Url)).ToList();

        return new ReportDto(
            r.Id,
            r.Source.ToString().ToUpperInvariant(),
            reporterRef,
            r.TargetType.ToString().ToUpperInvariant(),
            r.TargetId,
            r.TargetCourseId,
            ownerRef,
            r.ReasonCode,
            r.Description,
            r.TargetSnapshot,
            r.Status.ToString().ToUpperInvariant(),
            r.ResolutionReason,
            r.ResolvedAt,
            r.CreatedAt,
            evDtos,
            r.AiScore);
    }
}
