using System.Security.Claims;
using BrainMemo.Profile.Api.Requests;
using BrainMemo.Profile.Application.Commands.UpdateMyProfile;
using BrainMemo.Profile.Application.DTOs;
using BrainMemo.Profile.Application.Queries.GetMyProfile;
using BrainMemo.Profile.Contracts;
using BrainMemo.Profile.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Profile.Api.Controllers;

[ApiController]
[Route("api/v1/profiles")]
public sealed class ProfilesController(
    ISender sender,
    IProfileContract profileContract) : ControllerBase
{
    /// <summary>
    /// Gets current authenticated user's profile with self-healing support (FR-PRF-01..04).
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyProfile(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<ProfileDto> result = await sender
            .Send(new GetMyProfileQuery(userId), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Updates current authenticated user's profile and optional avatar (FR-PRF-01..04,07).
    /// </summary>
    [Authorize]
    [HttpPut("me")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UpdateMyProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        UpdateMyProfileCommand command = new(
            userId,
            request.DisplayName,
            request.Bio,
            request.ShowCourseList ?? true,
            request.UiTheme ?? "LIGHT",
            request.AvatarUploadKey,
            request.RemoveAvatar);

        Result<ProfileDto> result = await sender
            .Send(command, ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    /// <summary>
    /// Retrieves a public profile by user ID (FR-PRF-06).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{userId:guid}")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublicProfile(
        [FromRoute] Guid userId,
        CancellationToken ct)
    {
        Result<PublicProfileDto> result = await profileContract
            .GetPublicProfile(userId, ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return new ObjectResult(result.Error);
        }

        PublicProfileDto publicDto = result.Value;
        ProfileDto response = new(
            publicDto.UserId,
            publicDto.DisplayName,
            publicDto.AvatarUrl,
            publicDto.Bio,
            publicDto.ShowCourseList,
            "LIGHT",
            publicDto.JoinedAt);

        return Ok(response);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }
}
