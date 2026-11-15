using System.Security.Claims;
using BrainMemo.Course.Api.DTOs;
using BrainMemo.Course.Application.Commands.CreateCourse;
using BrainMemo.Course.Application.Commands.DeleteCourse;
using BrainMemo.Course.Application.Commands.UpdateCourse;
using BrainMemo.Course.Application.Queries.GetCourse;
using BrainMemo.Course.Application.Queries.GetCourseStats;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Course.Api.Controllers;

[ApiController]
[Route("api/v1/courses")]
public sealed class CoursesController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpPost]
    [ProducesResponseType<CourseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateCourse([FromBody] CourseUpsertRequest request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        AccessMode accessMode = ParseAccessMode(request.AccessMode) ?? AccessMode.Public;
        CourseStatus status = ParseStatus(request.Status) ?? CourseStatus.Updating;

        CreateCourseCommand command = new(
            OwnerUserId: userId,
            Name: request.Name,
            Description: request.Description,
            AccessMode: accessMode,
            Status: status,
            Tags: request.Tags,
            CoverUploadKey: request.CoverUploadKey);

        Result<CourseDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? CreatedAtAction(nameof(GetCourse), new { courseId = result.Value.Id }, result.Value)
            : new ObjectResult(result.Error);
    }

    [AllowAnonymous]
    [HttpGet("{courseId:guid}")]
    [ProducesResponseType<CourseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourse([FromRoute] Guid courseId, CancellationToken ct)
    {
        Guid? viewerUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;

        GetCourseQuery query = new(courseId, viewerUserId);
        Result<CourseDto> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPatch("{courseId:guid}")]
    [ProducesResponseType<CourseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCourse(
        [FromRoute] Guid courseId,
        [FromBody] CourseUpsertRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        AccessMode? accessMode = ParseAccessMode(request.AccessMode);
        CourseStatus? status = ParseStatus(request.Status);

        UpdateCourseCommand command = new(
            CourseId: courseId,
            CurrentUserId: userId,
            Name: request.Name,
            Description: request.Description,
            AccessMode: accessMode,
            Status: status,
            Tags: request.Tags,
            CoverUploadKey: request.CoverUploadKey,
            RemoveCover: request.RemoveCover);

        Result<CourseDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("{courseId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCourse([FromRoute] Guid courseId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        DeleteCourseCommand command = new(courseId, userId);
        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpGet("{courseId:guid}/stats")]
    [ProducesResponseType<CourseStatsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseStats([FromRoute] Guid courseId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        Result<CourseStatsDto> result = await sender.Send(new GetCourseStatsQuery(courseId, userId), ct).ConfigureAwait(false);
        if (result.IsFailure)
        {
            if (result.Error.Code == "COURSE_NOT_FOUND")
            {
                return NotFound(result.Error);
            }

            if (result.Error.Code == ErrorCodes.Forbidden)
            {
                return StatusCode(StatusCodes.Status403Forbidden, result.Error);
            }

            return new ObjectResult(result.Error);
        }

        return Ok(result.Value);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }

    private static AccessMode? ParseAccessMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant() switch
        {
            "PUBLIC" => AccessMode.Public,
            "PRIVATE" => AccessMode.Private,
            "ONLY_ME" => AccessMode.OnlyMe,
            _ => null,
        };
    }

    private static CourseStatus? ParseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant() switch
        {
            "UPDATING" => CourseStatus.Updating,
            "COMPLETED" => CourseStatus.Completed,
            "PAUSED" => CourseStatus.Paused,
            _ => null,
        };
    }
}
