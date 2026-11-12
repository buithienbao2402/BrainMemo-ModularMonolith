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

namespace BrainMemo.Identity.Application.Auth.Commands.Register;

internal sealed class RegisterCommandHandler(
    IIdentityAuthRepository authRepository,
    IPasswordHasher passwordHasher,
    ITokenCryptoService tokenCryptoService,
    IPostCommitEventQueue postCommitEvents,
    IOptions<IdentityOptions> options,
    IClock clock) : ICommandHandler<RegisterCommand>
{
    public async Task<Result> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        Result<EmailAddress> emailResult = EmailAddress.Create(request.Email);
        if (emailResult.IsFailure)
        {
            return emailResult.Error;
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return Error.Validation("Mật khẩu không được để trống.");
        }

        EmailAddress normalizedEmail = emailResult.Value;
        bool alreadyExists = await authRepository
            .EmailExistsAsync(normalizedEmail.Value, cancellationToken)
            .ConfigureAwait(false);

        if (alreadyExists)
        {
            return Error.Conflict(ErrorCodes.EmailTaken, "Địa chỉ email đã được sử dụng.");
        }

        TimeSpan verificationTtl = options.Value.EmailVerificationTokenTtl;
        if (verificationTtl <= TimeSpan.Zero)
        {
            throw new InvalidOperationException(
                "Identity:EmailVerificationTokenTtl must be greater than zero.");
        }

        DateTimeOffset utcNow = clock.UtcNow;
        Guid userId = UuidV7.NewGuid(utcNow);
        string passwordHash = passwordHasher.Hash(request.Password);

        Result<User> userResult = User.CreateWithPassword(
            userId,
            normalizedEmail,
            passwordHash,
            utcNow,
            markEmailVerified: false);

        if (userResult.IsFailure)
        {
            return userResult.Error;
        }

        User user = userResult.Value;
        Guid tokenId = UuidV7.NewGuid(utcNow);
        string rawToken = tokenCryptoService.GenerateOpaqueToken();
        byte[] tokenHash = tokenCryptoService.HashToken(rawToken);
        DateTimeOffset expiresAt = utcNow.Add(verificationTtl);

        Result<UserToken> tokenResult = user.IssueToken(
            tokenId,
            UserTokenPurpose.VerifyEmail,
            tokenHash,
            expiresAt,
            utcNow);

        if (tokenResult.IsFailure)
        {
            return tokenResult.Error;
        }

        user.ClearDomainEvents();

        Result saveResult = await authRepository
            .AddUserAndSaveAsync(user, cancellationToken)
            .ConfigureAwait(false);

        if (saveResult.IsFailure)
        {
            return saveResult;
        }

        // Enqueued for in-process dispatch strictly after TransactionBehavior commits (ADR-02 / NFR-04).
        postCommitEvents.Enqueue(new UserRegistered(
            UuidV7.NewGuid(utcNow),
            utcNow,
            user.Id));

        postCommitEvents.Enqueue(new EmailVerificationRequested(
            UuidV7.NewGuid(utcNow),
            utcNow,
            user.Id,
            tokenId,
            rawToken));

        return Result.Success();
    }
}
