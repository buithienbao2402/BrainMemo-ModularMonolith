using BrainMemo.Identity.Contracts;

namespace BrainMemo.Identity.Application.Admin.DTOs;

public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string AccountStatus,
    DateTimeOffset? LockedUntil,
    bool IsAdmin,
    bool EmailVerified,
    DateTimeOffset CreatedAt);

public sealed record PageMetaDto(
    int Page,
    int PageSize,
    int Total,
    int TotalPages);

public sealed record AdminUserListResponse(
    IReadOnlyList<AdminUserDto> Items,
    PageMetaDto Meta);

public sealed record AdminLockUserRequest(
    LockType Type,
    DateTimeOffset? Until,
    string Reason);

public sealed record AdminUnlockUserRequest(
    string Reason);
