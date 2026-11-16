using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.Profile.Contracts;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.GetReportById;

public sealed record GetReportByIdQuery(Guid Id) : IRequest<Result<ReportDto>>;

public sealed class GetReportByIdQueryHandler(
    IModerationRepository repository,
    IProfileContract profileContract) : IRequestHandler<GetReportByIdQuery, Result<ReportDto>>
{
    public async Task<Result<ReportDto>> Handle(GetReportByIdQuery query, CancellationToken ct)
    {
        Report? r = await repository.FindReportByIdAsync(query.Id, ct).ConfigureAwait(false);
        if (r is null)
        {
            return Error.NotFound("Không tìm thấy báo cáo.");
        }

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

        ReportDto dto = new(
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

        return Result.Success(dto);
    }
}
