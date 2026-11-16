using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Outcomes.Commands.CreatePlo;
using BrainMemo.Assessment.Application.Outcomes.Commands.DeletePlo;
using BrainMemo.Assessment.Application.Outcomes.Commands.UpdatePlo;
using BrainMemo.Assessment.Application.Outcomes.Queries.ListPlos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Assessment.Api.Controllers;

[ApiController]
public class PloController(ISender sender) : ControllerBase
{
    [HttpGet("api/v1/courses/{courseId:guid}/assessment/plos")]
    [ProducesResponseType<IReadOnlyList<PloDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPlos([FromRoute] Guid courseId, CancellationToken ct = default)
    {
        var result = await sender.Send(new ListPlosQuery(courseId), ct).ConfigureAwait(false);
        return result.IsSuccess ? Ok(result.Value) : new ObjectResult(result.Error);
    }

    [HttpPost("api/v1/courses/{courseId:guid}/assessment/plos")]
    [ProducesResponseType<PloDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreatePlo(
        [FromRoute] Guid courseId,
        [FromBody] PloDto request,
        CancellationToken ct = default)
    {
        var command = new CreatePloCommand(courseId, request.Code, request.Description);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == "PLO_CODE_EXISTS")
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status409Conflict };
            }
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return StatusCode(StatusCodes.Status201Created, result.Value);
    }

    [HttpPut("api/v1/courses/{courseId:guid}/assessment/plos/{id:guid}")]
    [ProducesResponseType<PloDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdatePlo(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        [FromBody] PloDto request,
        CancellationToken ct = default)
    {
        var command = new UpdatePloCommand(courseId, id, request.Code, request.Description);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == "PLO_CODE_EXISTS")
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

    [HttpDelete("api/v1/courses/{courseId:guid}/assessment/plos/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlo(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        CancellationToken ct = default)
    {
        var command = new DeletePloCommand(courseId, id);
        var result = await sender.Send(command, ct).ConfigureAwait(false);
        if (!result.IsSuccess)
        {
            if (result.Error.Code == ErrorCodes.NotFound)
            {
                return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status404NotFound };
            }
            return new ObjectResult(result.Error) { StatusCode = StatusCodes.Status400BadRequest };
        }

        return NoContent();
    }
}
