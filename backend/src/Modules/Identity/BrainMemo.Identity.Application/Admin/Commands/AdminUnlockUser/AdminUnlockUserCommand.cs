using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Identity.Application.Admin.Commands.AdminUnlockUser;

public sealed record AdminUnlockUserCommand(
    Guid TargetUserId,
    string Reason,
    Guid ActorAdminId) : IRequest<Result>;

public sealed class AdminUnlockUserCommandHandler(
    IIdentityContract identityContract)
    : IRequestHandler<AdminUnlockUserCommand, Result>
{
    public async Task<Result> Handle(
        AdminUnlockUserCommand request,
        CancellationToken ct)
    {
        return await identityContract.UnlockAccount(
            request.TargetUserId,
            request.Reason,
            request.ActorAdminId,
            ct).ConfigureAwait(false);
    }
}
