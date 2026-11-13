using System.Security.Claims;
using BrainMemo.Course.Application.Queries.ListMyCourses;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Course.Api.Controllers;

[ApiController]
[Route("api/v1/me/courses")]
public sealed class MeCoursesController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpGet]
    [ProducesResponseType<PagedResult<CourseCardDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListMyCourses(
        [FromQuery] string relation = "OWNED",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListMyCoursesQuery query = new(userId, relation, page, pageSize);
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
