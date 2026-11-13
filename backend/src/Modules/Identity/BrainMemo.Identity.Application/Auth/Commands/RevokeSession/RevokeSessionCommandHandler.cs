using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.RevokeSession;

public sealed class RevokeSessionCommandHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IClock clock) : ICommandHandler<RevokeSessionCommand, RevokeSessionResult>
{
    public async Task<Result<RevokeSessionResult>> Handle(RevokeSessionCommand request, CancellationToken ct)
    {
        if (request.SessionId == Guid.Empty)
        {
            return Error.Validation("ID phiên đăng nhập không hợp lệ.");
        }

        if (request.UserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        RefreshSession? session = await authRepository.FindSessionByIdAsync(request.SessionId, ct).ConfigureAwait(false);
        if (session is null || session.UserId != request.UserId)
        {
            return Error.NotFound("Không tìm thấy phiên đăng nhập.");
        }

        byte[]? currentTokenHash = !string.IsNullOrWhiteSpace(request.RawRefreshToken)
            ? tokenCryptoService.HashToken(request.RawRefreshToken.Trim())
            : null;

        bool wasCurrent = currentTokenHash != null && session.TokenHash.AsSpan().SequenceEqual(currentTokenHash);

        if (session.RevokedAt is null)
        {
            await authRepository.RevokeSessionByIdAsync(
                request.SessionId,
                request.UserId,
                SessionRevokeReason.UserRevoked,
                clock.UtcNow,
                ct).ConfigureAwait(false);
        }

        return new RevokeSessionResult(WasCurrent: wasCurrent);
    }
}
