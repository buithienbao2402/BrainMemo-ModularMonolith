using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Queries.GetMe;

public sealed class GetMeQueryHandler(
    IIdentityAuthRepository authRepository,
    IClock clock) : IQueryHandler<GetMeQuery, CurrentUserDto>
{
    public async Task<Result<CurrentUserDto>> Handle(GetMeQuery request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        User? user = await authRepository
            .FindUserByIdAsync(request.UserId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        user.UnlockIfExpired(utcNow);

        bool isAdmin = await authRepository
            .IsUserAdminAsync(user.Id, cancellationToken)
            .ConfigureAwait(false);

        return new CurrentUserDto(
            Id: user.Id,
            Email: user.Email,
            EmailVerified: user.IsEmailVerified,
            IsAdmin: isAdmin,
            AccountStatus: user.AccountStatus.ToDatabaseValue());
    }
}
