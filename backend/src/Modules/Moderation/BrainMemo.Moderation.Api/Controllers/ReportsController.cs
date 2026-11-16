using System.Security.Claims;
using BrainMemo.Moderation.Application.Commands.CreateReport;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Application.Queries.ListCourseReports;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Moderation.Api.Controllers;

[ApiController]
[Authorize]
public sealed class ReportsController(ISender sender) : ControllerBase
{
    [HttpPost("api/v1/reports")]
    [ProducesResponseType<IdResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateReport(
        [FromBody] CreateReportRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerUserId))
        {
            return Unauthorized();
        }

        Result<Guid> result = await sender
            .Send(new CreateReportCommand(callerUserId, request), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return StatusCode(StatusCodes.Status201Created, new IdResponse(result.Value));
    }

    [HttpGet("api/v1/courses/{courseId:guid}/reports")]
    [ProducesResponseType<PagedListResponse<ReportDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListCourseReports(
        [FromRoute] Guid courseId,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid callerUserId))
        {
            return Unauthorized();
        }

        Result<PagedListResponse<ReportDto>> result = await sender
            .Send(new ListCourseReportsQuery(courseId, callerUserId, status, page, pageSize), ct)
            .ConfigureAwait(false);

        if (result.IsFailure)
        {
            return MapErrorToResult(result.Error);
        }

        return Ok(result.Value);
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
            ErrorCodes.DuplicateReport or ErrorCodes.AlreadyLocked or ErrorCodes.InvalidState => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        };

        return new ObjectResult(error) { StatusCode = statusCode };
    }
}
