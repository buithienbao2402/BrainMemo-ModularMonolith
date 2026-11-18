using System.Security.Claims;
using BrainMemo.Identity.Contracts;
using BrainMemo.Moderation.Application.Commands.ApplySanction;
using BrainMemo.Moderation.Application.Commands.CourseReview;
using BrainMemo.Moderation.Application.Commands.LiftSanction;
using BrainMemo.Moderation.Application.Commands.ResolveReport;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.Moderation.Application.Queries.GetDashboard;
using BrainMemo.Moderation.Application.Queries.GetReportById;
using BrainMemo.Moderation.Application.Queries.GetTargetContent;
using BrainMemo.Moderation.Application.Queries.ListAuditLogs;
using BrainMemo.Moderation.Application.Queries.ListReports;
using BrainMemo.Moderation.Application.Queries.ListSanctions;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Moderation.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/admin")]
public sealed class AdminModerationController(
    ISender sender,
    IIdentityContract identityContract) : ControllerBase
{
    [HttpGet("reports")]
    [ProducesResponseType<PagedListResponse<ReportDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListReports(
        [FromQuery] string? status = null,
        [FromQuery] string? source = null,
        [FromQuery] string? targetType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new ListReportsQuery(status, source, targetType, page, pageSize), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpGet("reports/{id:guid}")]
    [ProducesResponseType<ReportDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReport(
        [FromRoute] Guid id,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender.Send(new GetReportByIdQuery(id), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpGet("reports/{id:guid}/target-content")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReportTargetContent(
        [FromRoute] Guid id,
        [FromQuery] Guid? chapterId = null,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender.Send(new GetReportTargetContentQuery(id, chapterId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpPost("reports/{id:guid}/resolve")]
    [ProducesResponseType<ReportDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ResolveReport(
        [FromRoute] Guid id,
        [FromBody] ResolveReportRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid adminId)) return Unauthorized();
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new ResolveReportCommand(id, adminId, request), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpPost("sanctions")]
    [ProducesResponseType<IdResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ApplySanction(
        [FromBody] SanctionRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid adminId)) return Unauthorized();
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new ApplySanctionCommand(adminId, request), ct)
            .ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, new IdResponse(result.Value))
            : MapErrorToResult(result.Error);
    }

    [HttpGet("sanctions")]
    [ProducesResponseType<PagedListResponse<SanctionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListSanctions(
        [FromQuery] bool? active = null,
        [FromQuery] string? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new ListSanctionsQuery(active, type, page, pageSize), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpPost("sanctions/{id:guid}/lift")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> LiftSanction(
        [FromRoute] Guid id,
        [FromBody] LiftSanctionRequest request,
        CancellationToken ct = default)
    {
        if (!TryGetCallerId(out Guid adminId)) return Unauthorized();
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new LiftSanctionCommand(id, adminId, request), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? NoContent() : MapErrorToResult(result.Error);
    }

    [HttpGet("audit-logs")]
    [ProducesResponseType<PagedListResponse<AuditLogDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAuditLogs(
        [FromQuery] string? action = null,
        [FromQuery] string? objectType = null,
        [FromQuery] Guid? actorUserId = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender
            .Send(new ListAuditLogsQuery(action, objectType, actorUserId, from, to, page, pageSize), ct)
            .ConfigureAwait(false);

        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpGet("dashboard")]
    [ProducesResponseType<ModerationDashboardDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard(CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender.Send(new GetModerationDashboardQuery(), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpGet("courses/review-queue")]
    [ProducesResponseType<PagedListResponse<BrainMemo.Course.Contracts.Dtos.CourseReviewQueueItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListCourseReviewQueue(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct)) return Forbid();

        var result = await sender.Send(new ListCourseReviewQueueQuery(status, page, pageSize), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : MapErrorToResult(result.Error);
    }

    [HttpPost("courses/{courseId:guid}/approve")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ApproveCoursePublish(
        [FromRoute] Guid courseId,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct) || !TryGetCallerId(out Guid adminId)) return Forbid();

        var result = await sender.Send(new ApproveCoursePublishCommand(courseId, adminId), ct).ConfigureAwait(false);
        return result.IsSuccess ? NoContent() : MapErrorToResult(result.Error);
    }

    [HttpPost("courses/{courseId:guid}/reject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RejectCoursePublish(
        [FromRoute] Guid courseId,
        [FromBody] RejectCoursePublishRequest request,
        CancellationToken ct = default)
    {
        if (!await IsAdminAsync(ct) || !TryGetCallerId(out Guid adminId)) return Forbid();

        var result = await sender.Send(new RejectCoursePublishCommand(courseId, adminId, request.Reason), ct).ConfigureAwait(false);
        return result.IsSuccess ? NoContent() : MapErrorToResult(result.Error);
    }

    private bool TryGetCallerId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId) && userId != Guid.Empty;
    }

    private async Task<bool> IsAdminAsync(CancellationToken ct)
    {
        if (!TryGetCallerId(out Guid callerId))
        {
            return false;
        }

        var result = await identityContract.IsAdmin(callerId, ct).ConfigureAwait(false);
        return result.IsSuccess && result.Value;
    }

    private IActionResult MapErrorToResult(Error error)
    {
        int statusCode = error.Code switch
        {
            ErrorCodes.NotFound => StatusCodes.Status404NotFound,
            ErrorCodes.Forbidden => StatusCodes.Status403Forbidden,
            ErrorCodes.Unauthenticated => StatusCodes.Status401Unauthorized,
            ErrorCodes.LastAdmin or ErrorCodes.SelfLock or ErrorCodes.AlreadyLocked or ErrorCodes.InvalidState or ErrorCodes.DuplicateReport => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        };

        return new ObjectResult(error) { StatusCode = statusCode };
    }
}
