using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.ChangePassword;

internal sealed class ChangePasswordCommandHandler(
    IIdentityAuthRepository authRepository,
    IPasswordHasher passwordHasher,
    IClock clock) : ICommandHandler<ChangePasswordCommand>
{
    private const string InvalidCredentialsMessage = "Mật khẩu hiện tại không chính xác.";

    public async Task<Result> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        if (request.UserId == Guid.Empty)
        {
            return Error.Validation("ID người dùng không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            return Error.Validation("Mật khẩu hiện tại không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return Error.Validation("Mật khẩu mới không được để trống.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        User? user = await authRepository
            .FindUserByIdAsync(request.UserId, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return Error.NotFound("Không tìm thấy người dùng.");
        }

        user.UnlockIfExpired(utcNow);

        if (!user.IsEffectivelyActive(utcNow))
        {
            return new Error(ErrorCodes.AccountLocked, "Tài khoản của bạn đang bị khóa.");
        }

        if (string.IsNullOrWhiteSpace(user.PasswordHash)
            || !passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return new Error(ErrorCodes.InvalidCredentials, InvalidCredentialsMessage);
        }

        string newPasswordHash = passwordHasher.Hash(request.NewPassword);
        Result updateResult = user.SetPasswordHash(newPasswordHash, utcNow);
        if (updateResult.IsFailure)
        {
            return updateResult.Error;
        }

        // Revoke all active sessions so other devices must re-authenticate with the new password.
        await authRepository
            .RevokeAllUserSessionsAsync(user.Id, SessionRevokeReason.LogoutAll, utcNow, cancellationToken)
            .ConfigureAwait(false);

        user.RevokeAllActiveSessions(SessionRevokeReason.LogoutAll, utcNow);
        user.ClearDomainEvents();

        Result saveResult = await authRepository
            .SaveUserAsync(user, cancellationToken)
            .ConfigureAwait(false);

        if (saveResult.IsFailure)
        {
            return saveResult;
        }

        return Result.Success();
    }
}
