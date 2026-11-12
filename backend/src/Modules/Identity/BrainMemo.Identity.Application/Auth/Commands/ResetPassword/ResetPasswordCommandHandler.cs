using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.ResetPassword;

internal sealed class ResetPasswordCommandHandler(
    IIdentityAuthRepository authRepository,
    IPasswordHasher passwordHasher,
    ITokenCryptoService tokenCryptoService,
    IClock clock) : ICommandHandler<ResetPasswordCommand>
{
    private const string InvalidTokenMessage = "Liên kết hoặc mã xác thực không hợp lệ hoặc đã hết hạn.";

    public async Task<Result> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return Error.Validation("Token xác thực không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return Error.Validation("Mật khẩu mới không được để trống.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        byte[] tokenHash = tokenCryptoService.HashToken(request.Token.Trim());

        Guid? userId = await authRepository
            .TryConsumeUserTokenAsync(UserTokenPurpose.ResetPassword, tokenHash, utcNow, cancellationToken)
            .ConfigureAwait(false);

        if (!userId.HasValue)
        {
            return new Error(ErrorCodes.TokenInvalidOrExpired, InvalidTokenMessage);
        }

        User? user = await authRepository
            .FindUserByIdAsync(userId.Value, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            return new Error(ErrorCodes.TokenInvalidOrExpired, InvalidTokenMessage);
        }

        string newPasswordHash = passwordHasher.Hash(request.NewPassword);
        Result updateResult = user.SetPasswordHash(newPasswordHash, utcNow);
        if (updateResult.IsFailure)
        {
            return updateResult.Error;
        }

        user.UnlockIfExpired(utcNow);

        // Invalidate any other unconsumed reset tokens for this user.
        await authRepository
            .InvalidateUserTokensAsync(user.Id, UserTokenPurpose.ResetPassword, utcNow, cancellationToken)
            .ConfigureAwait(false);

        user.InvalidateTokens(UserTokenPurpose.ResetPassword, utcNow);

        // Revoke all active sessions upon password reset (BACKLOG: thu hồi phiên khi đổi mật khẩu).
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
