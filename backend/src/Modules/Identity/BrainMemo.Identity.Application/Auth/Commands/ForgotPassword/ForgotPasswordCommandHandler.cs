using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Options;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.Identity.Domain.Enums;
using BrainMemo.Identity.Domain.ValueObjects;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Options;

namespace BrainMemo.Identity.Application.Auth.Commands.ForgotPassword;

internal sealed class ForgotPasswordCommandHandler(
    IIdentityAuthRepository authRepository,
    ITokenCryptoService tokenCryptoService,
    IPostCommitEventQueue postCommitEvents,
    IOptions<IdentityOptions> options,
    IClock clock) : ICommandHandler<ForgotPasswordCommand>
{
    public async Task<Result> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        Result<EmailAddress> emailResult = EmailAddress.Create(request.Email);
        if (emailResult.IsFailure)
        {
            // Do not reveal email existence / format details to external callers; always 204.
            return Result.Success();
        }

        DateTimeOffset utcNow = clock.UtcNow;
        User? user = await authRepository
            .FindUserByEmailAsync(emailResult.Value.Value, cancellationToken)
            .ConfigureAwait(false);

        if (user is null)
        {
            // Thwart account enumeration; return 204 without leaking that email does not exist.
            return Result.Success();
        }

        user.UnlockIfExpired(utcNow);

        if (!user.IsEffectivelyActive(utcNow))
        {
            // Locked users cannot reset password; return 204 to avoid leaking lock state.
            return Result.Success();
        }

        // Invalidate previous unconsumed tokens of the same purpose (FR-IDN-07 / THIET_KE_CSDL §3.1.6).
        await authRepository
            .InvalidateUserTokensAsync(user.Id, UserTokenPurpose.ResetPassword, utcNow, cancellationToken)
            .ConfigureAwait(false);

        user.InvalidateTokens(UserTokenPurpose.ResetPassword, utcNow);

        Guid tokenId = UuidV7.NewGuid(utcNow);
        string rawToken = tokenCryptoService.GenerateOpaqueToken();
        byte[] tokenHash = tokenCryptoService.HashToken(rawToken);
        DateTimeOffset expiresAt = utcNow.Add(options.Value.PasswordResetTokenTtl);

        Result<UserToken> tokenResult = user.IssueToken(
            tokenId,
            UserTokenPurpose.ResetPassword,
            tokenHash,
            expiresAt,
            utcNow);

        if (tokenResult.IsFailure)
        {
            return tokenResult.Error;
        }

        user.ClearDomainEvents();

        Result saveResult = await authRepository
            .SaveUserAsync(user, cancellationToken)
            .ConfigureAwait(false);

        if (saveResult.IsFailure)
        {
            return saveResult;
        }

        // Enqueued for in-process dispatch strictly after TransactionBehavior commits (NFR-04).
        postCommitEvents.Enqueue(new PasswordResetRequested(
            UuidV7.NewGuid(utcNow),
            utcNow,
            user.Id,
            tokenId,
            rawToken));

        return Result.Success();
    }
}
