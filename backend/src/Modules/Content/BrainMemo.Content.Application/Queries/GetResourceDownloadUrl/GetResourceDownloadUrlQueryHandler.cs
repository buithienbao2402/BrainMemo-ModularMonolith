using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Content.Application.Queries.GetResourceDownloadUrl;

public sealed class GetResourceDownloadUrlQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IFileStorage fileStorage,
    IClock clock) : IQueryHandler<GetResourceDownloadUrlQuery, ResourceDownloadUrlDto>
{
    private static readonly TimeSpan DownloadUrlTtl = TimeSpan.FromMinutes(15);

    public async Task<Result<ResourceDownloadUrlDto>> Handle(GetResourceDownloadUrlQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ResourceDownloadUrlDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED" && !accessResult.Value.IsOwner)
        {
            return Result.Failure<ResourceDownloadUrlDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        // Must be owner or can read content
        if (!accessResult.Value.IsOwner && !accessResult.Value.CanReadContent)
        {
            return Result.Failure<ResourceDownloadUrlDto>(new Error("FORBIDDEN", "You do not have permission to download this resource."));
        }

        Resource? resource = await contentRepository.GetResourceByIdAsync(request.ResourceId, cancellationToken);
        if (resource is null || resource.CourseId != request.CourseId || resource.IsDeleted)
        {
            return Result.Failure<ResourceDownloadUrlDto>(new Error("RESOURCE_NOT_FOUND", "Resource not found."));
        }

        string url = await fileStorage.CreateDownloadUrl(
            resource.StorageKey,
            DownloadUrlTtl,
            resource.OriginalFilename,
            cancellationToken);

        DateTimeOffset expiresAt = clock.UtcNow.Add(DownloadUrlTtl);
        return Result.Success(new ResourceDownloadUrlDto(url, expiresAt));
    }
}
