using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.ListChapters;

public sealed class ListChaptersQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListChaptersQuery, IReadOnlyList<ChapterSummaryDto>>
{
    public async Task<Result<IReadOnlyList<ChapterSummaryDto>>> Handle(ListChaptersQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<ChapterSummaryDto>>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED" && !accessResult.Value.IsOwner)
        {
            return Result.Failure<IReadOnlyList<ChapterSummaryDto>>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        bool isOwner = accessResult.Value.IsOwner;

        IReadOnlyList<Chapter> chapters = await contentRepository.ListChaptersByCourseIdAsync(
            request.CourseId,
            includeDrafts: isOwner,
            cancellationToken);

        var dtos = chapters
            .OrderBy(c => c.Position)
            .Select(c => new ChapterSummaryDto(
                c.Id,
                c.Position,
                c.Title,
                c.Description,
                c.Status.ToString().ToUpperInvariant(),
                "PUBLIC",
                c.HasUnpublishedChanges))
            .ToList();

        return Result.Success<IReadOnlyList<ChapterSummaryDto>>(dtos);
    }
}
