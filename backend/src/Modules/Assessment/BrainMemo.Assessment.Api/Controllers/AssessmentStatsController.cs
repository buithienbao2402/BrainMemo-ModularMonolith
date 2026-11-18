using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.ExportAssessment;
using BrainMemo.Assessment.Application.Queries.GetAssessmentStats;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
public class AssessmentStatsController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assessment/stats")]
    [ProducesResponseType<AssessmentStatsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssessmentStats([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new GetAssessmentStatsQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportAssessment(
        [FromRoute] Guid courseId,
        [FromQuery] string format = "csv",
        [FromQuery] string? scope = "GRADEBOOK",
        CancellationToken ct = default)
    {
        var result = await sender.Send(new ExportAssessmentQuery(courseId, format, scope), ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return File(result.Value.Content, result.Value.ContentType, result.Value.FileName);
    }
}
