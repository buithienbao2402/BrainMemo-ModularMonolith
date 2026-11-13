using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Queries.ListSessions;

public sealed class ListSessionsQueryHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IClock clock) : IQueryHandler<ListSessionsQuery, IReadOnlyList<SessionDto>>
{
    public async Task<Result<IReadOnlyList<SessionDto>>> Handle(ListSessionsQuery request, CancellationToken ct)
    {
        if (request.UserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        DateTimeOffset utcNow = clock.UtcNow;

        byte[]? currentTokenHash = !string.IsNullOrWhiteSpace(request.RawRefreshToken)
            ? tokenCryptoService.HashToken(request.RawRefreshToken.Trim())
            : null;

        IReadOnlyList<RefreshSession> sessions = await authRepository
            .GetActiveSessionsForUserAsync(request.UserId, utcNow, ct)
            .ConfigureAwait(false);

        List<SessionDto> dtos = sessions
            .Select(s => new SessionDto(
                Id: s.Id,
                UserAgent: s.UserAgent,
                IpAddress: s.IpAddress,
                CreatedAt: s.CreatedAt,
                LastUsedAt: s.LastUsedAt,
                IsCurrent: currentTokenHash != null && s.TokenHash.AsSpan().SequenceEqual(currentTokenHash)))
            .ToList();

        return dtos;
    }
}
