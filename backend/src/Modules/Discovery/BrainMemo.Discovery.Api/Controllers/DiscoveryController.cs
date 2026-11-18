using System.Security.Claims;
using BrainMemo.Discovery.Application.Services;
using BrainMemo.Discovery.Contracts;
using BrainMemo.Discovery.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Discovery.Api.Controllers;

[ApiController]
[Route("api/v1/discovery")]
public sealed class DiscoveryController : ControllerBase
{
    private readonly IDiscoveryContract _discoveryContract;
    private readonly DiscoveryService _discoveryService;

    public DiscoveryController(
        IDiscoveryContract discoveryContract,
        DiscoveryService discoveryService)
    {
        _discoveryContract = discoveryContract;
        _discoveryService = discoveryService;
    }

    [HttpGet("home")]
    [ProducesResponseType<HomeSectionsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHome(CancellationToken ct)
    {
        Guid? currentUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        HomeSectionsDto home = await _discoveryContract.GetHomeSectionsAsync(currentUserId, ct);
        return Ok(home);
    }

    [HttpGet("courses")]
    [ProducesResponseType<PagedCourseCardsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchCourses(
        [FromQuery] string? q,
        [FromQuery] string? tag,
        [FromQuery] string? accessMode,
        [FromQuery] string? status,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        Guid? currentUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        SearchCoursesFilter filter = new(q, tag, accessMode, status, sort, page, pageSize);

        PagedCourseCardsDto result = await _discoveryContract.SearchCoursesAsync(filter, currentUserId, ct);
        return Ok(result);
    }

    [HttpGet("top10")]
    [ProducesResponseType<IReadOnlyList<Top10ItemDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTop10(
        [FromQuery] string metric,
        [FromQuery] string window,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(metric) || string.IsNullOrWhiteSpace(window))
        {
            return BadRequest(ProblemDetailsWriter("Tham số metric và window là bắt buộc."));
        }

        IReadOnlyList<Top10ItemDto> top10 = await _discoveryContract.GetTop10Async(metric, window, ct);
        return Ok(top10);
    }

    [Authorize]
    [HttpGet("search-history")]
    [ProducesResponseType<IReadOnlyList<SearchHistoryItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListSearchHistory(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized();
        }

        IReadOnlyList<SearchHistoryItemDto> history = await _discoveryContract.ListSearchHistoryAsync(userId, ct);
        return Ok(history);
    }

    [HttpGet("/api/v1/courses/{courseId:guid}/ranking")]
    [HttpGet("courses/{courseId:guid}/ranking")]
    [ProducesResponseType<CourseRankingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCourseRanking([FromRoute] Guid courseId, CancellationToken ct)
    {
        CourseRankingDto? ranking = await _discoveryContract.GetCourseRankingAsync(courseId, ct);
        if (ranking is null)
        {
            return NotFound(ProblemDetailsWriter("Không tìm thấy xếp hạng cho khóa học này."));
        }

        return Ok(ranking);
    }

    [HttpPost("rebuild")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> RebuildReadModel(CancellationToken ct)
    {
        int processed = await _discoveryService.RebuildReadModelAsync(ct);
        return Ok(new { ProcessedCourses = processed });
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? raw = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(raw, out userId);
    }

    private static ProblemDetails ProblemDetailsWriter(string detail)
    {
        return new ProblemDetails
        {
            Detail = detail,
            Status = StatusCodes.Status400BadRequest,
        };
    }
}
