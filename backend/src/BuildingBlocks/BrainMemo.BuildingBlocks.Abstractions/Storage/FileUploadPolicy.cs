using System.Collections.Frozen;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.BuildingBlocks.Abstractions.Storage;

/// <summary>
/// Validated metadata and byte ceiling resolved for a file upload request or committed temp object.
/// </summary>
public sealed record ValidatedFileUpload(
    FileUploadPurpose Purpose,
    string NormalizedExtension,
    string NormalizedContentType,
    long MaxBytes,
    bool IsImage);

/// <summary>
/// Central file size, extension, and MIME-type whitelist policy (DEC-05, THIET_KE_CSDL §4).
/// Shared across POST /files/upload-urls and module commit flows.
/// </summary>
public static class FileUploadPolicy
{
    public const long MaxImageBytes = 5L * 1024L * 1024L;
    public const long MaxFileBytes = 20L * 1024L * 1024L;

    private static readonly char[] InvalidFileNameCharacters = Path.GetInvalidFileNameChars();

    private static readonly FrozenDictionary<string, FrozenSet<string>> ImageExtensionMimeMap =
        CreateExtensionMap(new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = ["image/jpeg", "image/jpg"],
            [".jpeg"] = ["image/jpeg", "image/jpg"],
            [".png"] = ["image/png"],
            [".webp"] = ["image/webp"],
            [".gif"] = ["image/gif"],
        });

    private static readonly FrozenDictionary<string, FrozenSet<string>> DocumentAndMediaExtensionMimeMap =
        CreateExtensionMap(new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = ["application/pdf"],
            [".txt"] = ["text/plain"],
            [".md"] = ["text/markdown", "text/plain"],
            [".csv"] = ["text/csv", "application/vnd.ms-excel"],
            [".doc"] = ["application/msword"],
            [".docx"] = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
            [".ppt"] = ["application/vnd.ms-powerpoint"],
            [".pptx"] = ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
            [".xls"] = ["application/vnd.ms-excel"],
            [".xlsx"] = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
            [".zip"] = ["application/zip", "application/x-zip-compressed"],
            [".mp4"] = ["video/mp4"],
            [".webm"] = ["video/webm"],
            [".mov"] = ["video/quicktime"],
            [".mp3"] = ["audio/mpeg", "audio/mp3"],
            [".wav"] = ["audio/wav", "audio/x-wav", "audio/wave"],
            [".ogg"] = ["audio/ogg"],
            [".m4a"] = ["audio/mp4", "audio/x-m4a", "audio/m4a"],
            [".aac"] = ["audio/aac"],
        });

    public static bool IsImagePurposeOnly(FileUploadPurpose purpose) => purpose switch
    {
        FileUploadPurpose.Avatar => true,
        FileUploadPurpose.CourseCover => true,
        FileUploadPurpose.ReportEvidence => true,
        FileUploadPurpose.CourseResource => false,
        FileUploadPurpose.AssignmentFile => false,
        _ => true,
    };

    public static long GetMaxBytes(FileUploadPurpose purpose, string extension)
    {
        string normalizedExtension = NormalizeExtension(extension);
        if (ImageExtensionMimeMap.ContainsKey(normalizedExtension))
        {
            return MaxImageBytes;
        }

        return IsImagePurposeOnly(purpose) ? MaxImageBytes : MaxFileBytes;
    }

    public static string BuildTempObjectKey(Guid userId, Guid objectId, string fileNameOrExtension)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User ID cannot be empty.", nameof(userId));
        }

        if (objectId == Guid.Empty)
        {
            throw new ArgumentException("Object ID cannot be empty.", nameof(objectId));
        }

        string extension = NormalizeExtension(fileNameOrExtension);
        if (string.IsNullOrEmpty(extension))
        {
            throw new ArgumentException("A non-empty file extension is required.", nameof(fileNameOrExtension));
        }

        return $"tmp/{userId:D}/{objectId:D}{extension}";
    }

    public static Result<ValidatedFileUpload> ValidateUploadRequest(
        FileUploadPurpose purpose,
        string? fileName,
        long sizeBytes,
        string? contentType)
    {
        if (!Enum.IsDefined(purpose))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Mục đích tải tệp không hợp lệ.",
                [new ValidationFailureDetail("purpose", "Mục đích tải tệp không hợp lệ.")]));
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Tên tệp không được để trống.",
                [new ValidationFailureDetail("fileName", "Tên tệp là bắt buộc.")]));
        }

        string trimmedFileName = fileName.Trim();
        string baseName = Path.GetFileName(trimmedFileName);
        if (string.IsNullOrWhiteSpace(baseName)
            || baseName is "." or ".."
            || baseName.IndexOfAny(InvalidFileNameCharacters) >= 0)
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Tên tệp không hợp lệ.",
                [new ValidationFailureDetail("fileName", "Tên tệp chứa ký tự không hợp lệ.")]));
        }

        if (sizeBytes <= 0)
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Kích thước tệp phải lớn hơn 0 byte.",
                [new ValidationFailureDetail("sizeBytes", "Kích thước tệp phải lớn hơn 0.")]));
        }

        if (string.IsNullOrWhiteSpace(contentType))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Loại nội dung tệp là bắt buộc.",
                [new ValidationFailureDetail("contentType", "Content-Type là bắt buộc.")]));
        }

        string normalizedMime = NormalizeContentType(contentType);
        string normalizedExtension = NormalizeExtension(baseName);

        Result<ValidatedFileUpload> typeCheck = ValidateExtensionAndMime(purpose, normalizedExtension, normalizedMime);
        if (typeCheck.IsFailure)
        {
            return typeCheck;
        }

        ValidatedFileUpload spec = typeCheck.Value;
        if (sizeBytes > spec.MaxBytes)
        {
            long limitMb = spec.MaxBytes / (1024L * 1024L);
            return Result.Failure<ValidatedFileUpload>(new Error(
                ErrorCodes.FileTooLarge,
                $"Kích thước tệp vượt quá giới hạn {limitMb} MB cho phép.",
                [new ValidationFailureDetail("sizeBytes", $"Kích thước tối đa cho phép là {limitMb} MB ({spec.MaxBytes} bytes).")]));
        }

        return Result.Success(spec);
    }

    public static Result<ValidatedFileUpload> ValidateCommittedObject(
        FileUploadPurpose purpose,
        Guid ownerUserId,
        string uploadKey,
        FileHead? head)
    {
        if (ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("Owner user ID cannot be empty.", nameof(ownerUserId));
        }

        if (string.IsNullOrWhiteSpace(uploadKey))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Mã khóa tệp tải lên là bắt buộc.",
                [new ValidationFailureDetail("uploadKey", "uploadKey không được để trống.")]));
        }

        string expectedPrefix = $"tmp/{ownerUserId:D}/";
        string normalizedKey = uploadKey.Trim().TrimStart('/');
        if (!normalizedKey.StartsWith(expectedPrefix, StringComparison.Ordinal))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Forbidden("Bạn không có quyền sử dụng tệp tải lên này."));
        }

        if (head is null)
        {
            return Result.Failure<ValidatedFileUpload>(Error.NotFound("Không tìm thấy tệp đã tải lên trong vùng tạm."));
        }

        string filePart = normalizedKey[expectedPrefix.Length..];
        if (filePart.Contains('/', StringComparison.Ordinal) || string.IsNullOrWhiteSpace(filePart))
        {
            return Result.Failure<ValidatedFileUpload>(Error.Validation(
                "Định dạng khóa tệp không hợp lệ.",
                [new ValidationFailureDetail("uploadKey", "Định dạng uploadKey không hợp lệ.")]));
        }

        return ValidateUploadRequest(purpose, filePart, head.Size, head.ContentType);
    }

    private static Result<ValidatedFileUpload> ValidateExtensionAndMime(
        FileUploadPurpose purpose,
        string normalizedExtension,
        string normalizedMime)
    {
        if (string.IsNullOrEmpty(normalizedExtension))
        {
            return Result.Failure<ValidatedFileUpload>(new Error(
                ErrorCodes.FileTypeNotAllowed,
                "Tệp tải lên phải có phần mở rộng hợp lệ.",
                [new ValidationFailureDetail("fileName", "Thiếu phần mở rộng của tệp.")]));
        }

        if (ImageExtensionMimeMap.TryGetValue(normalizedExtension, out FrozenSet<string>? allowedImageMimes))
        {
            if (!allowedImageMimes.Contains(normalizedMime))
            {
                return Result.Failure<ValidatedFileUpload>(new Error(
                    ErrorCodes.FileTypeNotAllowed,
                    $"Content-Type '{normalizedMime}' không khớp hoặc không được hỗ trợ cho tệp '{normalizedExtension}'.",
                    [new ValidationFailureDetail("contentType", "Loại nội dung (Content-Type) không hợp lệ cho tệp này.")]));
            }

            return Result.Success(new ValidatedFileUpload(
                purpose,
                normalizedExtension,
                normalizedMime,
                MaxImageBytes,
                IsImage: true));
        }

        if (IsImagePurposeOnly(purpose))
        {
            return Result.Failure<ValidatedFileUpload>(new Error(
                ErrorCodes.FileTypeNotAllowed,
                $"Mục đích {purpose} chỉ cho phép ảnh (.jpg, .jpeg, .png, .webp, .gif).",
                [new ValidationFailureDetail("fileName", "Định dạng tệp không được hỗ trợ cho mục đích này.")]));
        }

        if (DocumentAndMediaExtensionMimeMap.TryGetValue(normalizedExtension, out FrozenSet<string>? allowedFileMimes))
        {
            if (!allowedFileMimes.Contains(normalizedMime))
            {
                return Result.Failure<ValidatedFileUpload>(new Error(
                    ErrorCodes.FileTypeNotAllowed,
                    $"Content-Type '{normalizedMime}' không khớp hoặc không được hỗ trợ cho tệp '{normalizedExtension}'.",
                    [new ValidationFailureDetail("contentType", "Loại nội dung (Content-Type) không hợp lệ cho tệp này.")]));
            }

            return Result.Success(new ValidatedFileUpload(
                purpose,
                normalizedExtension,
                normalizedMime,
                MaxFileBytes,
                IsImage: false));
        }

        return Result.Failure<ValidatedFileUpload>(new Error(
            ErrorCodes.FileTypeNotAllowed,
            $"Định dạng tệp '{normalizedExtension}' không được hỗ trợ.",
            [new ValidationFailureDetail("fileName", $"Định dạng '{normalizedExtension}' không nằm trong danh sách cho phép.")]));
    }

    private static string NormalizeExtension(string fileNameOrExtension)
    {
        if (string.IsNullOrWhiteSpace(fileNameOrExtension))
        {
            return string.Empty;
        }

        string trimmed = fileNameOrExtension.Trim();
        if (trimmed.StartsWith('.') && !trimmed.AsSpan(1).Contains('.'))
        {
            return trimmed.ToLowerInvariant();
        }

        string ext = Path.GetExtension(trimmed);
        return string.IsNullOrEmpty(ext) ? string.Empty : ext.ToLowerInvariant();
    }

    private static string NormalizeContentType(string contentType)
    {
        int semicolonIndex = contentType.IndexOf(';', StringComparison.Ordinal);
        string mediaType = semicolonIndex >= 0 ? contentType[..semicolonIndex] : contentType;
        return mediaType.Trim().ToLowerInvariant();
    }

    private static FrozenDictionary<string, FrozenSet<string>> CreateExtensionMap(
        Dictionary<string, string[]> raw)
    {
        Dictionary<string, FrozenSet<string>> result = new(StringComparer.OrdinalIgnoreCase);
        foreach (KeyValuePair<string, string[]> entry in raw)
        {
            result[entry.Key] = entry.Value.ToFrozenSet(StringComparer.OrdinalIgnoreCase);
        }

        return result.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);
    }
}
