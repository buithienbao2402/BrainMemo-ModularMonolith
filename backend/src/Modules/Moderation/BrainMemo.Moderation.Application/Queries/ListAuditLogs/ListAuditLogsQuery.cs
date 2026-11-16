using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Contracts.Enums;
using BrainMemo.Moderation.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.ListAuditLogs;

public sealed record ListAuditLogsQuery(
    string? Action,
    string? ObjectType,
    Guid? ActorUserId,
    DateTimeOffset? From,
    DateTimeOffset? To,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedListResponse<AuditLogDto>>>;

public sealed class ListAuditLogsQueryHandler(
    IModerationRepository repository) : IRequestHandler<ListAuditLogsQuery, Result<PagedListResponse<AuditLogDto>>>
{
    public async Task<Result<PagedListResponse<AuditLogDto>>> Handle(ListAuditLogsQuery query, CancellationToken ct)
    {
        AuditAction? action = null;
        if (!string.IsNullOrWhiteSpace(query.Action) && Enum.TryParse<AuditAction>(query.Action.Replace("_", string.Empty), true, out var parsedAction))
        {
            action = parsedAction;
        }

        AuditObjectType? objectType = null;
        if (!string.IsNullOrWhiteSpace(query.ObjectType) && Enum.TryParse<AuditObjectType>(query.ObjectType, true, out var parsedObjType))
        {
            objectType = parsedObjType;
        }

        int page = Math.Max(1, query.Page);
        int pageSize = Math.Clamp(query.PageSize, 1, 50);

        PagedListResponse<AuditLog> logs = await repository.ListAuditLogsAsync(
            action,
            objectType,
            query.ActorUserId,
            query.From,
            query.To,
            page,
            pageSize,
            ct).ConfigureAwait(false);

        List<AuditLogDto> dtos = logs.Items.Select(l => new AuditLogDto(
            l.Id,
            l.OccurredAt,
            l.ActorType.ToString().ToUpperInvariant(),
            l.ActorUserId,
            l.Action.ToString().ToUpperInvariant(),
            l.ObjectType.ToString().ToUpperInvariant(),
            l.ObjectId,
            l.ObjectLabel,
            l.Reason,
            l.Details,
            l.ReportId,
            l.SanctionId)).ToList();

        return Result.Success(new PagedListResponse<AuditLogDto>(dtos, logs.Meta));
    }
}
