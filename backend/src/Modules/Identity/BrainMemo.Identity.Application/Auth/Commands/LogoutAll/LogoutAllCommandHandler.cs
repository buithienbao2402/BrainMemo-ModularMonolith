using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.LogoutAll;

public sealed class LogoutAllCommandHandler(
    IIdentityAuthRepository authRepository,
    IClock clock) : ICommandHandler<LogoutAllCommand>
{
    public async Task<Result> Handle(LogoutAllCommand request, CancellationToken ct)
    {
        if (request.UserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        await authRepository
            .RevokeAllUserSessionsAsync(request.UserId, SessionRevokeReason.LogoutAll, clock.UtcNow, ct)
            .ConfigureAwait(false);

        return Result.Success();
    }
}
