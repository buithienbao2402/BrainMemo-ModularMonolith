using BrainMemo.Identity.Application.Admin.DTOs;
using BrainMemo.Identity.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Identity.Application.Abstractions;

public interface IIdentityAdminRepository
{
    Task<AdminUserListResponse> ListUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        CancellationToken ct = default);

    Task<User?> FindUserByIdAsync(Guid userId, CancellationToken ct = default);

    Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct = default);

    Task<Result> GrantAdminRoleAsync(
        Guid targetUserId,
        Guid actorAdminId,
        DateTimeOffset utcNow,
        CancellationToken ct = default);

    Task<Result> RevokeAdminRoleAsync(
        Guid targetUserId,
        Guid actorAdminId,
        DateTimeOffset utcNow,
        CancellationToken ct = default);
}
