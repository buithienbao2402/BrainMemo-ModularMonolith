using System.Security.Claims;
using BrainMemo.Course.Application.Queries.ListProfileCourses;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Course.Api.Controllers;

[ApiController]
[Route("api/v1/profiles/{userId:guid}/courses")]
public sealed class ProfileCoursesController(ISender sender) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType<PagedResult<CourseCardDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListProfileCourses(
        [FromRoute] Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        Guid? viewerUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;

        ListProfileCoursesQuery query = new(userId, viewerUserId, page, pageSize);
        Result<PagedResult<CourseCardDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }
}
