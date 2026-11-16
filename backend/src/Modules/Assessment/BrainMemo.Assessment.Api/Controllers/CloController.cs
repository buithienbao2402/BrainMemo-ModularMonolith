using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Outcomes.Commands.CreateClo;
using BrainMemo.Assessment.Application.Outcomes.Commands.DeleteClo;
using BrainMemo.Assessment.Application.Outcomes.Commands.UpdateClo;
using BrainMemo.Assessment.Application.Outcomes.Queries.ListClos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
public class CloController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assessment/clos")]
    [ProducesResponseType<IReadOnlyList<CloDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListClos([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new ListClosQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpPost("api/v1/courses/{courseId:guid}/assessment/clos")]
    [ProducesResponseType<CloDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateClo(
        [FromRoute] Guid courseId,
        [FromBody] CloDto request,
        CancellationToken ct = default)
    {
        var command = new CreateCloCommand(
            courseId,
            request.Code,
            request.Description,
            request.BloomLevelCode,
            request.LinkedPloIds);

        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == "CLO_CODE_EXISTS")
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status409Conflict };
            }
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    [HttpPut("api/v1/courses/{courseId:guid}/assessment/clos/{id:guid}")]
    [ProducesResponseType<CloDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateClo(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        [FromBody] CloDto request,
        CancellationToken ct = default)
    {
        var command = new UpdateCloCommand(
            courseId,
            id,
            request.Code,
            request.Description,
            request.BloomLevelCode,
            request.LinkedPloIds);

        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == "CLO_CODE_EXISTS")
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status409Conflict };
            }
            if (result.Error.Code == ErrorCodes.NotFound)
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status404NotFound };
            }
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return Ok(result.Value);
    }

    [HttpDelete("api/v1/courses/{courseId:guid}/assessment/clos/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteClo(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        CancellationToken ct = default)
    {
        var command = new DeleteCloCommand(courseId, id);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == "CLO_IN_USE")
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status409Conflict };
            }
            if (result.Error.Code == ErrorCodes.NotFound)
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status404NotFound };
            }
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return NoContent();
    }
}
