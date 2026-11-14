using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.ListChapterVersions;

public sealed class ListChapterVersionsQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListChapterVersionsQuery, IReadOnlyList<ChapterVersionDto>>
{
    public async Task<Result<IReadOnlyList<ChapterVersionDto>>> Handle(ListChapterVersionsQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<ChapterVersionDto>>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<IReadOnlyList<ChapterVersionDto>>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<IReadOnlyList<ChapterVersionDto>>(new Error("FORBIDDEN", "Only the course owner can view version history."));
        }

        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<IReadOnlyList<ChapterVersionDto>>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        IReadOnlyList<ChapterVersion> versions = await contentRepository.ListChapterVersionsPagedAsync(
            chapter.Id,
            request.Page,
            request.PageSize,
            cancellationToken);

        var dtos = versions.Select(v => new ChapterVersionDto(
            v.VersionNo,
            v.CreatedAt,
            v.PublishedAt,
            v.RestoredFromVersionNo)).ToList();

        return Result.Success<IReadOnlyList<ChapterVersionDto>>(dtos);
    }
}
