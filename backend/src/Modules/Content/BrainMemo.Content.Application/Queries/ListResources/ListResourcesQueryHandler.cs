using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.ListResources;

public sealed class ListResourcesQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListResourcesQuery, IReadOnlyList<ResourceDto>>
{
    public async Task<Result<IReadOnlyList<ResourceDto>>> Handle(ListResourcesQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<ResourceDto>>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<IReadOnlyList<ResourceDto>>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<IReadOnlyList<ResourceDto>>(new Error("FORBIDDEN", "Only the course owner can list resources."));
        }

        IReadOnlyList<Resource> resources = await contentRepository.ListResourcesByCourseIdAsync(
            request.CourseId,
            cancellationToken);

        var dtos = resources
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ResourceDto(
                r.Id,
                r.Kind.ToString().ToUpperInvariant(),
                r.OriginalFilename,
                r.ContentType,
                r.SizeBytes,
                r.CreatedAt))
            .ToList();

        return Result.Success<IReadOnlyList<ResourceDto>>(dtos);
    }
}
