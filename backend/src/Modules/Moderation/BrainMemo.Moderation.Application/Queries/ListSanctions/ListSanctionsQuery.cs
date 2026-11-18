using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.ListSanctions;

public sealed record ListSanctionsQuery(
    bool? Active,
    string? Type,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedListResponse<SanctionDto>>>;

public sealed class ListSanctionsQueryHandler(
    IModerationRepository repository) : IRequestHandler<ListSanctionsQuery, Result<PagedListResponse<SanctionDto>>>
{
    public async Task<Result<PagedListResponse<SanctionDto>>> Handle(ListSanctionsQuery query, CancellationToken ct)
    {
        SanctionType? sanctionType = null;
        if (!string.IsNullOrWhiteSpace(query.Type) && Enum.TryParse<SanctionType>(query.Type.Replace("_", string.Empty), true, out var parsedType))
        {
            sanctionType = parsedType;
        }

        int page = Math.Max(1, query.Page);
        int pageSize = Math.Clamp(query.PageSize, 1, 50);

        PagedListResponse<Sanction> sanctions = await repository.ListSanctionsAsync(
            query.Active,
            sanctionType,
            page,
            pageSize,
            ct).ConfigureAwait(false);

        List<SanctionDto> dtos = sanctions.Items.Select(s => new SanctionDto(
            s.Id,
            s.ReportId,
            s.SanctionType.ToString().ToUpperInvariant(),
            s.TargetType.ToString().ToUpperInvariant(),
            s.TargetId,
            s.SubjectUserId,
            s.Reason,
            s.AppliedByUserId,
            s.AppliedAt,
            s.ExpiresAt,
            s.LiftedAt,
            s.LiftedByUserId,
            s.LiftReason,
            s.LiftKind?.ToString().ToUpperInvariant(),
            s.IsActive)).ToList();

        return Result.Success(new PagedListResponse<SanctionDto>(dtos, sanctions.Meta));
    }
}
