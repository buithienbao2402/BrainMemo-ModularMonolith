using BrainMemo.Identity.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Xunit;

namespace Identity.UnitTests.Domain;

public sealed class AdminGrantTests
{
    private static readonly DateTimeOffset BaseUtc = new(2026, 11, 12, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void CreateSeedGrant_AllowsNullGrantedBy_AndRevokeWorksOnce()
    {
        Guid grantId = UuidV7.NewGuid(BaseUtc);
        Guid userId = UuidV7.NewGuid(BaseUtc);
        Guid actorId = UuidV7.NewGuid(BaseUtc.AddMinutes(5));

        Result<AdminGrant> createResult = AdminGrant.Create(grantId, userId, BaseUtc, grantedByUserId: null);
        Assert.True(createResult.IsSuccess);
        AdminGrant grant = createResult.Value;
        Assert.True(grant.IsActive);
        Assert.Null(grant.GrantedByUserId);

        Result firstRevoke = grant.Revoke(BaseUtc.AddMinutes(5), actorId);
        Assert.True(firstRevoke.IsSuccess);
        Assert.False(grant.IsActive);
        Assert.Equal(actorId, grant.RevokedByUserId);

        Result secondRevoke = grant.Revoke(BaseUtc.AddMinutes(6), actorId);
        Assert.True(secondRevoke.IsFailure);
        Assert.Equal(ErrorCodes.InvalidState, secondRevoke.Error.Code);
    }

    [Fact]
    public void CreateOrRevoke_WithEmptyIds_ReturnsValidationError()
    {
        Result<AdminGrant> emptyUser = AdminGrant.Create(UuidV7.NewGuid(), Guid.Empty, BaseUtc);
        Assert.True(emptyUser.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, emptyUser.Error.Code);

        Result<AdminGrant> emptyGranters = AdminGrant.Create(UuidV7.NewGuid(), UuidV7.NewGuid(), BaseUtc, Guid.Empty);
        Assert.True(emptyGranters.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, emptyGranters.Error.Code);

        AdminGrant grant = AdminGrant.Create(UuidV7.NewGuid(), UuidV7.NewGuid(), BaseUtc).Value;
        Result revokeWithEmptyActor = grant.Revoke(BaseUtc.AddMinutes(1), Guid.Empty);
        Assert.True(revokeWithEmptyActor.IsFailure);
        Assert.Equal(ErrorCodes.ValidationFailed, revokeWithEmptyActor.Error.Code);
    }
}

