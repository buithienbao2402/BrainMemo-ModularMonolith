using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;

internal sealed class VerifyEmailCommandHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IClock clock) : ICommandHandler<VerifyEmailCommand>
{
    private const string InvalidTokenMessage = "Liên kết hoặc mã xác thực không hợp lệ hoặc đã hết hạn.";

    public async Task<Result> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return Error.Validation("Token xác minh email không được để trống.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        byte[] tokenHash = tokenCryptoService.HashToken(request.Token.Trim());

        Guid? userId = await authRepository
            .TryConsumeUserTokenAsync(UserTokenPurpose.VerifyEmail, tokenHash, utcNow, cancellationToken)
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

        return user.VerifyEmail(utcNow);
    }
}
