using System.Security.Claims;
using BrainMemo.Assessment.Application.Commands.DeleteComponent;
using BrainMemo.Assessment.Application.Commands.UpdateAssessmentConfig;
using BrainMemo.Assessment.Application.Commands.UpsertComponent;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Queries.GetAssessmentConfig;
using BrainMemo.Assessment.Application.Queries.GetComponent;
using BrainMemo.Assessment.Application.Queries.ListAssessableBlocks;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
[Authorize]
public sealed class AssessmentConfigController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assessment/config")]
    [ProducesResponseType<AssessmentConfigDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssessmentConfig([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new GetAssessmentConfigQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpPut("api/v1/courses/{courseId:guid}/assessment/config")]
    [ProducesResponseType<AssessmentConfigDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateAssessmentConfig(
        [FromRoute] Guid courseId,
        [FromBody] AssessmentConfigDto request,
        CancellationToken ct = default)
    {
        var command = new UpdateAssessmentConfigCommand(
            courseId,
            request.PassThreshold,
            request.ScoreSelectionRule,
            request.GradeScale,
            request.AchievementLevels,
            request.BloomScale,
            request.PloEnabled);

        var result = await sender.Send(command, ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error) { StatusCode = 400 };
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/assessable-blocks")]
    [ProducesResponseType<IReadOnlyList<ComponentDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListAssessableBlocks([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new ListAssessableBlocksQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpGet("api/v1/courses/{courseId:guid}/assessment/components/{blockId:guid}")]
    [ProducesResponseType<ComponentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetComponent(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct = default)
    {
        var result = await sender.Send(new GetComponentQuery(courseId, blockId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error) { StatusCode = 404 };
    }

    [HttpPut("api/v1/courses/{courseId:guid}/assessment/components/{blockId:guid}")]
    [ProducesResponseType<ComponentDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpsertComponent(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        [FromBody] UpsertComponentRequest request,
        CancellationToken ct = default)
    {
        var command = new UpsertComponentCommand(courseId, blockId, request.CourseWeight, request.CloWeights);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error) { StatusCode = 400 };
    }

    [HttpDelete("api/v1/courses/{courseId:guid}/assessment/components/{blockId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteComponent(
        [FromRoute] Guid courseId,
        [FromRoute] Guid blockId,
        CancellationToken ct = default)
    {
        var command = new DeleteComponentCommand(courseId, blockId);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            return new ObjectResult(result.Error) { StatusCode = 409 };
        }
        return NoContent();
    }
}
