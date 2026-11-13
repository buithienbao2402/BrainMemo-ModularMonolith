using System.Security.Claims;
using BrainMemo.Identity.Application.Auth.Commands.ChangePassword;
using BrainMemo.Identity.Application.Auth.Commands.ForgotPassword;
using BrainMemo.Identity.Application.Auth.Commands.Login;
using BrainMemo.Identity.Application.Auth.Commands.Logout;
using BrainMemo.Identity.Application.Auth.Commands.LogoutAll;
using BrainMemo.Identity.Application.Auth.Commands.Refresh;
using BrainMemo.Identity.Application.Auth.Commands.Register;
using BrainMemo.Identity.Application.Auth.Commands.ResetPassword;
using BrainMemo.Identity.Application.Auth.Commands.RevokeSession;
using BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;
using BrainMemo.Identity.Application.Auth.Models;
using BrainMemo.Identity.Application.Auth.Queries.GetMe;
using BrainMemo.Identity.Application.Auth.Queries.ListSessions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Hosting;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Authentication endpoints matching <c>openapi/modules/identity.yaml</c> (T-S1-BE-02 &amp; T-S1-BE-03 scope).
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(
    ISender sender,
    IHostEnvironment environment) : ControllerBase
{
    /// <summary>
    /// Registers a new user account and dispatches an email verification event after commit (FR-IDN-01).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Register(
        [FromBody] CredentialsRequest request,
        CancellationToken ct)
    {
        Result result = await sender
            .Send(new RegisterCommand(request.Email, request.Password), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created)
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Consumes a one-time email verification token and marks the user's email as verified (FR-IDN-02).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("verify-email")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> VerifyEmail(
        [FromBody] VerifyEmailRequest request,
        CancellationToken ct)
    {
        Result result = await sender
            .Send(new VerifyEmailCommand(request.Token), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Authenticates credentials, sets HttpOnly refresh cookie, and returns access token (FR-IDN-03).
    /// </summary>
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [HttpPost("login")]
    [ProducesResponseType<AuthTokensResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Login(
        [FromBody] CredentialsRequest request,
        CancellationToken ct)
    {
        string? userAgent = Request.Headers.UserAgent.ToString();
        string? ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        Result<AuthTokensResult> result = await sender
            .Send(new LoginCommand(request.Email, request.Password, userAgent, ipAddress), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return new ObjectResult(result.Error);
        }

        SetRefreshTokenCookie(result.Value.RawRefreshToken, result.Value.ExpiresAt);

        return Ok(new AuthTokensResponse(
            result.Value.AccessToken,
            result.Value.ExpiresIn,
            new CurrentUserResponse(
                result.Value.User.Id,
                result.Value.User.Email,
                result.Value.User.EmailVerified,
                result.Value.User.IsAdmin,
                result.Value.User.AccountStatus)));
    }

    /// <summary>
    /// Rotates refresh token cookie and issues new access/refresh tokens (FR-IDN-05).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType<AuthTokensResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        string? rawRefreshToken = Request.Cookies[AuthCookieConstants.RefreshTokenCookieName]
            ?? Request.Cookies[AuthCookieConstants.AlternativeCookieName];

        string? userAgent = Request.Headers.UserAgent.ToString();
        string? ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        Result<AuthTokensResult> result = await sender
            .Send(new RefreshTokenCommand(rawRefreshToken, userAgent, ipAddress), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            if (result.Error.Code == ErrorCodes.AccountLocked)
            {
                ClearRefreshTokenCookie();
            }

            return new ObjectResult(result.Error);
        }

        SetRefreshTokenCookie(result.Value.RawRefreshToken, result.Value.ExpiresAt);

        return Ok(new AuthTokensResponse(
            result.Value.AccessToken,
            result.Value.ExpiresIn,
            new CurrentUserResponse(
                result.Value.User.Id,
                result.Value.User.Email,
                result.Value.User.EmailVerified,
                result.Value.User.IsAdmin,
                result.Value.User.AccountStatus)));
    }

    /// <summary>
    /// Logs out current session and clears refresh cookie (FR-IDN-04).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        string? rawRefreshToken = Request.Cookies[AuthCookieConstants.RefreshTokenCookieName]
            ?? Request.Cookies[AuthCookieConstants.AlternativeCookieName];

        await sender
            .Send(new LogoutCommand(rawRefreshToken), ct)
            .ConfigureAwait(false);

        ClearRefreshTokenCookie();
        return NoContent();
    }

    /// <summary>
    /// Revokes all active refresh sessions for the current user and clears cookie (FR-IDN-10).
    /// </summary>
    [Authorize]
    [HttpPost("logout-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return new ObjectResult(Error.Unauthenticated("Chưa xác thực"));
        }

        Result result = await sender
            .Send(new LogoutAllCommand(userId), ct)
            .ConfigureAwait(false);

        ClearRefreshTokenCookie();

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Retrieves active sessions for the current user and marks the active session (FR-IDN-09).
    /// </summary>
    [Authorize]
    [HttpGet("sessions")]
    [ProducesResponseType<IReadOnlyList<SessionResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListSessions(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return new ObjectResult(Error.Unauthenticated("Chưa xác thực"));
        }

        string? rawRefreshToken = Request.Cookies[AuthCookieConstants.RefreshTokenCookieName]
            ?? Request.Cookies[AuthCookieConstants.AlternativeCookieName];

        Result<IReadOnlyList<SessionDto>> result = await sender
            .Send(new ListSessionsQuery(userId, rawRefreshToken), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return new ObjectResult(result.Error);
        }

        List<SessionResponse> responses = result.Value
            .Select(s => new SessionResponse(
                s.Id,
                s.UserAgent,
                s.IpAddress,
                s.CreatedAt,
                s.LastUsedAt,
                s.IsCurrent))
            .ToList();

        return Ok(responses);
    }

    /// <summary>
    /// Revokes a specific session belonging to current user (FR-IDN-09).
    /// </summary>
    [Authorize]
    [HttpDelete("sessions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeSession([FromRoute] Guid id, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return new ObjectResult(Error.Unauthenticated("Chưa xác thực"));
        }

        string? rawRefreshToken = Request.Cookies[AuthCookieConstants.RefreshTokenCookieName]
            ?? Request.Cookies[AuthCookieConstants.AlternativeCookieName];

        Result<RevokeSessionResult> result = await sender
            .Send(new RevokeSessionCommand(id, userId, rawRefreshToken), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return new ObjectResult(result.Error);
        }

        if (result.Value.WasCurrent)
        {
            ClearRefreshTokenCookie();
        }

        return NoContent();
    }

    /// <summary>
    /// Initiates password reset for a user email (FR-IDN-07). Always returns 204 to prevent email enumeration.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordRequest request,
        CancellationToken ct)
    {
        await sender
            .Send(new ForgotPasswordCommand(request.Email), ct)
            .ConfigureAwait(false);

        return NoContent();
    }

    /// <summary>
    /// Resets password using a one-time reset token (FR-IDN-07).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken ct)
    {
        Result result = await sender
            .Send(new ResetPasswordCommand(request.Token, request.NewPassword), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Changes password for authenticated user and revokes all active sessions (FR-IDN-08).
    /// </summary>
    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return new ObjectResult(Error.Unauthenticated("Chưa xác thực"));
        }

        Result result = await sender
            .Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return new ObjectResult(result.Error);
        }

        ClearRefreshTokenCookie();
        return NoContent();
    }

    /// <summary>
    /// Retrieves current user profile and account status.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return new ObjectResult(Error.Unauthenticated("Chưa xác thực"));
        }

        Result<CurrentUserDto> result = await sender
            .Send(new GetMeQuery(userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(new CurrentUserResponse(
                result.Value.Id,
                result.Value.Email,
                result.Value.EmailVerified,
                result.Value.IsAdmin,
                result.Value.AccountStatus))
            : new ObjectResult(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId) && userId != Guid.Empty;
    }

    private void SetRefreshTokenCookie(string token, DateTimeOffset expiresAt)
    {
        CookieOptions cookieOptions = new()
        {
            HttpOnly = true,
            Secure = Request.IsHttps || !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = AuthCookieConstants.CookiePath,
            Expires = expiresAt.UtcDateTime,
        };
        Response.Cookies.Append(AuthCookieConstants.RefreshTokenCookieName, token, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        CookieOptions cookieOptions = new()
        {
            HttpOnly = true,
            Secure = Request.IsHttps || !environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Path = AuthCookieConstants.CookiePath,
            Expires = DateTimeOffset.UnixEpoch.UtcDateTime,
        };
        Response.Cookies.Delete(AuthCookieConstants.RefreshTokenCookieName, cookieOptions);
    }
}
