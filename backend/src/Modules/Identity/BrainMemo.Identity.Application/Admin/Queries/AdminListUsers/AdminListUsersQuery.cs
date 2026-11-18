using BrainMemo.Identity.Application.Abstractions;
using BrainMemo.Identity.Application.Admin.DTOs;
using BrainMemo.SharedKernel.Results;
using MediatR;

namespace BrainMemo.Identity.Application.Admin.Queries.AdminListUsers;

public sealed record AdminListUsersQuery(
    int Page = 1,
    int PageSize = 20,
    string? Search = null,
    string? Status = null) : IRequest<Result<AdminUserListResponse>>;

public sealed class AdminListUsersQueryHandler(
    IIdentityAdminRepository adminRepository)
    : IRequestHandler<AdminListUsersQuery, Result<AdminUserListResponse>>
{
    public async Task<Result<AdminUserListResponse>> Handle(
        AdminListUsersQuery request,
        CancellationToken ct)
    {
        int page = Math.Max(1, request.Page);
        int pageSize = Math.Clamp(request.PageSize, 1, 100);

        AdminUserListResponse response = await adminRepository.ListUsersAsync(
            page,
            pageSize,
            request.Search,
            request.Status,
            ct).ConfigureAwait(false);

        return Result.Success(response);
    }
}
