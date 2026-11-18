using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Identity.Application.Admin.Commands.GrantAdmin;

public sealed record GrantAdminCommand(
    Guid TargetUserId,
    Guid ActorAdminId) : IRequest<Result>;

public sealed class GrantAdminCommandHandler(
    IIdentityAdminRepository adminRepository,
    IClock clock)
    : IRequestHandler<GrantAdminCommand, Result>
{
    public async Task<Result> Handle(
        GrantAdminCommand request,
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

        return await adminRepository.GrantAdminRoleAsync(
            request.TargetUserId,
            request.ActorAdminId,
            clock.UtcNow,
            ct).ConfigureAwait(false);
    }
}
