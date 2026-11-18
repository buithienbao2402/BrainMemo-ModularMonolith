using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Identity.Application.Admin.Commands.RevokeAdmin;

public sealed record RevokeAdminCommand(
    Guid TargetUserId,
    Guid ActorAdminId) : IRequest<Result>;

public sealed class RevokeAdminCommandHandler(
    IIdentityAdminRepository adminRepository,
    IClock clock)
    : IRequestHandler<RevokeAdminCommand, Result>
{
    public async Task<Result> Handle(
        RevokeAdminCommand request,
        CancellationToken ct)
    {
        if (request.TargetUserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (request.ActorAdminId == Guid.Empty)
        {
            return Error.Validation("ID quản trị viên thực hiện không hợp lệ.");
        }

        return await adminRepository.RevokeAdminRoleAsync(
            request.TargetUserId,
            request.ActorAdminId,
            clock.UtcNow,
            ct).ConfigureAwait(false);
    }
}
