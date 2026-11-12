using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Domain.Entities;

/// <summary>
/// Separate aggregate root representing an Admin role assignment (<c>idn_admin_grant</c>, THIET_KE_CSDL §3.1.5).
/// </summary>
public sealed class AdminGrant : AggregateRoot
{
    private AdminGrant()
    {
    }

    private AdminGrant(
        Guid id,
        Guid userId,
        DateTimeOffset grantedAt,
        Guid? grantedByUserId)
        : base(id)
    {
        UserId = userId;
        GrantedAt = grantedAt;
        GrantedByUserId = grantedByUserId;
    }

    public Guid UserId { get; private set; }

    public DateTimeOffset GrantedAt { get; private set; }

    public Guid? GrantedByUserId { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public Guid? RevokedByUserId { get; private set; }

    public bool IsActive => RevokedAt is null;

    public static Result<AdminGrant> Create(
        Guid id,
        Guid userId,
        DateTimeOffset utcNow,
        Guid? grantedByUserId = null)
    {
        if (id == Guid.Empty)
        {
            return Error.Validation("ID phân quyền quản trị không hợp lệ.");
        }

        if (userId == Guid.Empty)
        {
            return Error.Validation("ID người dùng được cấp quyền không hợp lệ.");
        }

        if (grantedByUserId == Guid.Empty)
        {
            return Error.Validation("ID người cấp quyền không hợp lệ.");
        }

        return Result.Success(new AdminGrant(id, userId, utcNow, grantedByUserId));
    }

    public Result Revoke(DateTimeOffset utcNow, Guid? revokedByUserId = null)
    {
        if (!IsActive)
        {
            return Error.Conflict(ErrorCodes.InvalidState, "Quyền quản trị viên đã bị thu hồi trước đó.");
        }

        if (revokedByUserId == Guid.Empty)
        {
            return Error.Validation("ID người thu hồi quyền không hợp lệ.");
        }

        RevokedAt = utcNow;
        RevokedByUserId = revokedByUserId;
        return Result.Success();
    }
}

