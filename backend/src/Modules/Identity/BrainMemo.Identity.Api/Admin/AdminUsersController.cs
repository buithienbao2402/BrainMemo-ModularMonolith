using System.Security.Claims;
using BrainMemo.Identity.Application.Admin.Commands.AdminLockUser;
using BrainMemo.Identity.Application.Admin.Commands.AdminUnlockUser;
using BrainMemo.Identity.Application.Admin.Commands.GrantAdmin;
using BrainMemo.Identity.Application.Admin.Commands.RevokeAdmin;
using BrainMemo.Identity.Application.Admin.DTOs;
using BrainMemo.Identity.Application.Admin.Queries.AdminListUsers;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Identity.Api.Admin;

/// <summary>
/// Endpoints for identity administrator functions (FR-IDN-11, T-S10-BE-01).
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/admin/users")]
public sealed class AdminUsersController(
    ISender sender,
    IIdentityContract identityContract) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<AdminUserListResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return Unauthorized();
        }

        Result<bool> isAdminResult = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        if (isAdminResult.IsFailure || !isAdminResult.Value)
        {
            return Forbid();
        }

        Result<AdminUserListResponse> result = await sender
            .Send(new AdminListUsersQuery(page, pageSize, q, status), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return Ok(result.Value);
    }

    [HttpPut("{userId:guid}/admin-role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GrantAdmin(
        [FromRoute] Guid userId,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return Unauthorized();
        }

        Result<bool> isAdminResult = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        if (isAdminResult.IsFailure || !isAdminResult.Value)
        {
            return Forbid();
        }

        Result result = await sender
            .Send(new GrantAdminCommand(userId, callerId), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return NoContent();
    }

    [HttpDelete("{userId:guid}/admin-role")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RevokeAdmin(
        [FromRoute] Guid userId,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return Unauthorized();
        }

        Result<bool> isAdminResult = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        if (isAdminResult.IsFailure || !isAdminResult.Value)
        {
            return Forbid();
        }

        Result result = await sender
            .Send(new RevokeAdminCommand(userId, callerId), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return NoContent();
    }

    [HttpPut("{userId:guid}/lock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> LockUser(
        [FromRoute] Guid userId,
        [FromBody] AdminLockUserRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return Unauthorized();
        }

        Result<bool> isAdminResult = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        if (isAdminResult.IsFailure || !isAdminResult.Value)
        {
            return Forbid();
        }

        Result result = await sender
            .Send(new AdminLockUserCommand(
                userId,
                request.Type,
                request.Until,
                request.Reason,
                callerId), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return NoContent();
    }

    [HttpPut("{userId:guid}/unlock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UnlockUser(
        [FromRoute] Guid userId,
        [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] AdminUnlockUserRequest? request = null,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return Unauthorized();
        }

        Result<bool> isAdminResult = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        if (isAdminResult.IsFailure || !isAdminResult.Value)
        {
            return Forbid();
        }

        Result result = await sender
            .Send(new AdminUnlockUserCommand(userId, request?.Reason ?? "Mở khóa bởi quản trị viên", callerId), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return NoContent();
    }

    private bool TryGetCallerId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId) && userId != Guid.Empty;
    }

    private IActionResult MapErrorToResult(Error error)
    {
        int statusCode = error.Code switch
        {
            ErrorCodes.NotFound => StatusCodes.Status404NotFound,
            ErrorCodes.Forbidden => StatusCodes.Status403Forbidden,
            ErrorCodes.Unauthenticated => StatusCodes.Status401Unauthorized,
            ErrorCodes.LastAdmin or ErrorCodes.SelfLock or ErrorCodes.AlreadyLocked or ErrorCodes.InvalidState => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        };

        return new ObjectResult(error) { StatusCode = statusCode };
    }
}
