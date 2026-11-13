using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Domain.Entities;

public class Resource : AggregateRoot
{
    public const long MaxImageSizeBytes = 5L * 1024 * 1024; // 5 MB (DEC-05)
    public const long MaxGeneralFileSizeBytes = 20L * 1024 * 1024; // 20 MB (DEC-05)

    private Resource() { }

    public Resource(
        Guid id,
        Guid courseId,
        ResourceKind kind,
        string originalFilename,
        string contentType,
        long sizeBytes,
        string storageKey)
        : base(id)
    {
        CourseId = courseId;
        Kind = kind;
        OriginalFilename = originalFilename;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        StorageKey = storageKey;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid CourseId { get; private set; }
    public ResourceKind Kind { get; private set; }
    public string OriginalFilename { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public string StorageKey { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }

    public static Result<Resource> Create(
        Guid courseId,
        ResourceKind kind,
        string originalFilename,
        string contentType,
        long sizeBytes,
        string storageKey)
    {
        if (courseId == Guid.Empty)
            return Result.Failure<Resource>(new Error("COURSE_ID_REQUIRED", "Course id is required"));

        if (string.IsNullOrWhiteSpace(originalFilename))
            return Result.Failure<Resource>(new Error("FILENAME_REQUIRED", "Original filename is required"));

        if (string.IsNullOrWhiteSpace(contentType))
            return Result.Failure<Resource>(new Error("CONTENT_TYPE_REQUIRED", "Content type is required"));

        if (string.IsNullOrWhiteSpace(storageKey))
            return Result.Failure<Resource>(new Error("STORAGE_KEY_REQUIRED", "Storage key is required"));

        if (sizeBytes <= 0)
            return Result.Failure<Resource>(new Error("INVALID_FILE_SIZE", "File size must be greater than 0"));

        if (kind == ResourceKind.Image && sizeBytes > MaxImageSizeBytes)
            return Result.Failure<Resource>(new Error("IMAGE_SIZE_LIMIT_EXCEEDED", $"Image size cannot exceed {MaxImageSizeBytes} bytes (5 MB)"));

        if (sizeBytes > MaxGeneralFileSizeBytes)
            return Result.Failure<Resource>(new Error("FILE_SIZE_LIMIT_EXCEEDED", $"File size cannot exceed {MaxGeneralFileSizeBytes} bytes (20 MB)"));

        var resource = new Resource(
            Guid.NewGuid(),
            courseId,
            kind,
            originalFilename.Trim(),
            contentType.Trim(),
            sizeBytes,
            storageKey.Trim());

        return Result.Success(resource);
    }

    public void SoftDelete()
    {
        DeletedAt = DateTimeOffset.UtcNow;
    }

    public bool IsDeleted => DeletedAt.HasValue;
}
