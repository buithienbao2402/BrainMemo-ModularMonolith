using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.Logout;

public sealed class LogoutCommandHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IClock clock) : ICommandHandler<LogoutCommand>
{
    public async Task<Result> Handle(LogoutCommand request, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(request.RawRefreshToken))
        {
            byte[] tokenHash = tokenCryptoService.HashToken(request.RawRefreshToken.Trim());
            await authRepository
                .RevokeSessionByTokenHashAsync(tokenHash, SessionRevokeReason.Logout, clock.UtcNow, ct)
                .ConfigureAwait(false);
        }

        return Result.Success();
    }
}
