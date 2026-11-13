using System.Security.Claims;
using BrainMemo.Course.Api.DTOs;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Commands.CreateCourse;
using BrainMemo.Course.Application.Commands.DeleteCourse;
using BrainMemo.Course.Application.Commands.UpdateCourse;
using BrainMemo.Course.Application.Queries.GetCourse;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Api.Controllers;

[ApiController]
[Route("api/v1/courses")]
public sealed class CoursesController(ISender sender, ICourseRepository courseRepository) : ControllerBase
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

        CourseAccessMode accessMode = ParseAccessMode(request.AccessMode) ?? CourseAccessMode.Public;
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

        CourseAccessMode? accessMode = ParseAccessMode(request.AccessMode);
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

        CourseEntity? course = await courseRepository.GetByIdAsync(courseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return NotFound(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, Error.Forbidden("Chỉ chủ khóa mới có quyền xem thống kê."));
        }

        CourseStatsDto stats = await courseRepository.GetCourseStatsAsync(courseId, ct).ConfigureAwait(false);
        return Ok(stats);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }

    private static CourseAccessMode? ParseAccessMode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant() switch
        {
            "PUBLIC" => CourseAccessMode.Public,
            "PRIVATE" => CourseAccessMode.Private,
            "ONLY_ME" => CourseAccessMode.OnlyMe,
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
