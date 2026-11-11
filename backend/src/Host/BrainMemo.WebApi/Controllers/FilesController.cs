using System.Collections.Frozen;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.BuildingBlocks.Infrastructure.Storage;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using BrainMemo.WebApi.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BrainMemo.WebApi.Controllers;

/// <summary>
/// Pre-signed file upload endpoints matching openapi/modules/files.yaml.
/// </summary>
[ApiController]
[Authorize]
[Route("api/v1/files")]
public sealed class FilesController : ControllerBase
{
    private static readonly IReadOnlyDictionary<string, string> EmptyHeaders =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase).ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

    private readonly IFileStorage _fileStorage;
    private readonly IClock _clock;
    private readonly IOptions<S3Options> _s3Options;

    public FilesController(
        IFileStorage fileStorage,
        IClock clock,
        IOptions<S3Options> s3Options)
    {
        ArgumentNullException.ThrowIfNull(fileStorage);
        ArgumentNullException.ThrowIfNull(clock);
        ArgumentNullException.ThrowIfNull(s3Options);

        _fileStorage = fileStorage;
        _clock = clock;
        _s3Options = s3Options;
    }

    /// <summary>
    /// Creates a pre-signed PUT URL targeting tmp/{userId}/{objectId}.{ext} after validating file limits and whitelist.
    /// </summary>
    [HttpPost("upload-urls")]
    [ProducesResponseType<UploadUrlDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateUploadUrl(
        [FromBody] CreateUploadUrlRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out Guid userId))
        {
            return Result
                .Failure<UploadUrlDto>(Error.Unauthenticated("Không xác định được danh tính người dùng."))
                .ToActionResult(HttpContext);
        }

        Result<ValidatedFileUpload> validation = FileUploadPolicy.ValidateUploadRequest(
            request.Purpose!.Value,
            request.FileName,
            request.SizeBytes!.Value,
            request.ContentType);

        if (validation.IsFailure)
        {
            return Result.Failure<UploadUrlDto>(validation.Error).ToActionResult(HttpContext);
        }

        ValidatedFileUpload spec = validation.Value;
        Guid objectId = UuidV7.NewGuid(_clock.UtcNow);
        string tmpKey = FileUploadPolicy.BuildTempObjectKey(userId, objectId, spec.NormalizedExtension);
        TimeSpan ttl = _s3Options.Value.GetUploadUrlTtl();

        PresignedUpload presigned = await _fileStorage
            .CreateUploadUrl(tmpKey, spec.NormalizedContentType, spec.MaxBytes, ttl, ct)
            .ConfigureAwait(false);

        IReadOnlyDictionary<string, string> headers = presigned.Headers ?? EmptyHeaders;
        UploadUrlDto dto = new(
            presigned.UploadKey,
            presigned.UploadUrl,
            HttpMethods.Put,
            headers,
            presigned.ExpiresAt);

        return Ok(dto);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        string? rawUserId = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.Identity?.Name;

        return Guid.TryParse(rawUserId, out userId) && userId != Guid.Empty;
    }
}

public sealed record CreateUploadUrlRequest
{
    [Required(ErrorMessage = "Mục đích tải tệp là bắt buộc.")]
    public FileUploadPurpose? Purpose { get; init; }

    [Required(ErrorMessage = "Tên tệp là bắt buộc.")]
    public string? FileName { get; init; }

    [Required(ErrorMessage = "Kích thước tệp là bắt buộc.")]
    public long? SizeBytes { get; init; }

    [Required(ErrorMessage = "Loại nội dung (Content-Type) là bắt buộc.")]
    public string? ContentType { get; init; }

    public Guid? CourseId { get; init; }
}

public sealed record UploadUrlDto(
    string UploadKey,
    string UploadUrl,
    string Method,
    IReadOnlyDictionary<string, string> Headers,
    DateTimeOffset ExpiresAt);

