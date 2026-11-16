using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Identity.Application.Admin.Commands.AdminLockUser;

public sealed record AdminLockUserCommand(
    Guid TargetUserId,
    LockType Type,
    DateTimeOffset? Until,
    string Reason,
    Guid ActorAdminId) : IRequest<Result>;

public sealed class AdminLockUserCommandHandler(
    IIdentityContract identityContract)
    : IRequestHandler<AdminLockUserCommand, Result>
{
    public async Task<Result> Handle(
        AdminLockUserCommand request,
        CancellationToken ct)
    {
        Guid sanctionId = Guid.NewGuid();
        return await identityContract.LockAccount(
            request.TargetUserId,
            request.Type,
            request.Until,
            request.Reason,
            sanctionId,
            request.ActorAdminId,
            ct).ConfigureAwait(false);
    }
}
