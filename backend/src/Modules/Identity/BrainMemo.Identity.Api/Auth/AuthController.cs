using BrainMemo.Identity.Application.Auth.Commands.Register;
using BrainMemo.Identity.Application.Auth.Commands.VerifyEmail;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Identity.Api.Auth;

/// <summary>
/// Authentication endpoints matching <c>openapi/modules/identity.yaml</c> (T-S1-BE-02 scope).
/// </summary>
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController(ISender sender) : ControllerBase
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
}
