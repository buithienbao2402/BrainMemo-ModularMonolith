using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.DeleteResource;

public sealed class DeleteResourceCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<DeleteResourceCommand>
{
    public async Task<Result> Handle(DeleteResourceCommand request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure(new Error("FORBIDDEN", "Only the course owner can delete resources."));
        }

        Resource? resource = await contentRepository.GetResourceByIdAsync(request.ResourceId, cancellationToken);
        if (resource is null || resource.CourseId != request.CourseId || resource.IsDeleted)
        {
            return Result.Failure(new Error("RESOURCE_NOT_FOUND", "Resource not found."));
        }

        // Check if resource is currently referenced by any block
        bool inUse = await contentRepository.IsResourceInUseAsync(request.ResourceId, cancellationToken);
        if (inUse)
        {
            return Result.Failure(new Error("RESOURCE_IN_USE", "Cannot delete resource because it is still in use by content blocks."));
        }

        resource.SoftDelete();
        await contentRepository.UpdateResourceAsync(resource, cancellationToken);
        await contentRepository.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
