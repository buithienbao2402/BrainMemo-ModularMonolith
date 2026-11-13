using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.CreateResource;

public sealed class CreateResourceCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IFileStorage fileStorage) : ICommandHandler<CreateResourceCommand, ResourceDto>
{
    public async Task<Result<ResourceDto>> Handle(CreateResourceCommand request, CancellationToken cancellationToken)
    {
        // 1. Check ownership
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ResourceDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<ResourceDto>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ResourceDto>(new Error("FORBIDDEN", "Only the course owner can upload resources."));
        }

        // 2. Head check on uploaded file
        FileHead? head = await fileStorage.Head(request.UploadKey, cancellationToken);
        if (head is null)
        {
            return Result.Failure<ResourceDto>(new Error("UPLOADED_FILE_NOT_FOUND", "Uploaded file not found in temporary storage."));
        }

        // 3. Validate committed object per DEC-05 and policy
        Result<ValidatedFileUpload> validationResult = FileUploadPolicy.ValidateCommittedObject(
            FileUploadPurpose.CourseResource,
            request.RequesterUserId,
            request.UploadKey,
            head);

        if (validationResult.IsFailure)
        {
            return Result.Failure<ResourceDto>(validationResult.Error);
        }

        ValidatedFileUpload validated = validationResult.Value;

        // 4. Resolve resource kind
        ResourceKind kind = ResolveKind(validated.NormalizedExtension, validated.IsImage);

        // 5. Commit to permanent key
        Guid resourceId = Guid.NewGuid();
        string permanentKey = $"courses/{request.CourseId:D}/resources/{resourceId:D}{validated.NormalizedExtension}";

        await fileStorage.Commit(request.UploadKey, permanentKey, cancellationToken);

        // 6. Create domain Resource
        Result<Resource> resourceResult = Resource.Create(
            request.CourseId,
            kind,
            request.OriginalFilename,
            head.ContentType,
            head.Size,
            permanentKey);

        if (resourceResult.IsFailure)
        {
            return Result.Failure<ResourceDto>(resourceResult.Error);
        }

        Resource resource = resourceResult.Value;
        await contentRepository.AddResourceAsync(resource, cancellationToken);
        await contentRepository.SaveChangesAsync(cancellationToken);

        var dto = new ResourceDto(
            resource.Id,
            resource.Kind.ToString().ToUpperInvariant(),
            resource.OriginalFilename,
            resource.ContentType,
            resource.SizeBytes,
            resource.CreatedAt);

        return Result.Success(dto);
    }

    private static ResourceKind ResolveKind(string ext, bool isImage)
    {
        if (isImage) return ResourceKind.Image;
        return ext.ToLowerInvariant() switch
        {
            ".pdf" => ResourceKind.Pdf,
            ".mp4" or ".webm" or ".mov" => ResourceKind.Video,
            ".mp3" or ".wav" or ".ogg" or ".m4a" or ".aac" => ResourceKind.Audio,
            ".zip" or ".tar" or ".gz" or ".rar" => ResourceKind.Archive,
            _ => ResourceKind.Other
        };
    }
}
