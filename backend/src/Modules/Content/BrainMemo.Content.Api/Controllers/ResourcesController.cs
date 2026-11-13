using System.Security.Claims;
using BrainMemo.Content.Api.DTOs;
using BrainMemo.Content.Application.Commands.CreateResource;
using BrainMemo.Content.Application.Commands.DeleteResource;
using BrainMemo.Content.Application.Queries.GetResourceDownloadUrl;
using BrainMemo.Content.Application.Queries.ListResources;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BrainMemo.Content.Api.Controllers;

[ApiController]
[Route("api/v1/courses/{courseId:guid}/resources")]
public sealed class ResourcesController(ISender sender) : ControllerBase
{
    [Authorize]
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ResourceDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ListResources(
        [FromRoute] Guid courseId,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        ListResourcesQuery query = new(courseId, userId);
        Result<IReadOnlyList<ResourceDto>> result = await sender.Send(query, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? Ok(result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpPost]
    [ProducesResponseType<ResourceDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateResource(
        [FromRoute] Guid courseId,
        [FromBody] CreateResourceRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        CreateResourceCommand command = new(
            CourseId: courseId,
            RequesterUserId: userId,
            UploadKey: request.UploadKey,
            OriginalFilename: request.OriginalFilename);

        Result<ResourceDto> result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : new ObjectResult(result.Error);
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteResource(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Unauthorized(Error.Unauthenticated("Phiên đăng nhập không hợp lệ."));
        }

        DeleteResourceCommand command = new(
            CourseId: courseId,
            ResourceId: id,
            RequesterUserId: userId);

        Result result = await sender.Send(command, ct).ConfigureAwait(false);

        return result.IsSuccess
            ? NoContent()
            : new ObjectResult(result.Error);
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}/download-url")]
    [ProducesResponseType<ResourceDownloadUrlDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetResourceDownloadUrl(
        [FromRoute] Guid courseId,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        Guid? viewerUserId = TryGetCurrentUserId(out Guid uid) ? uid : null;
        GetResourceDownloadUrlQuery query = new(
            CourseId: courseId,
            ResourceId: id,
            RequesterUserId: viewerUserId);

        Result<ResourceDownloadUrlDto> result = await sender.Send(query, ct).ConfigureAwait(false);

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
