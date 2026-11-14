using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.GetChapterDraft;

public sealed class GetChapterDraftQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<GetChapterDraftQuery, ChapterDetailDto>
{
    public async Task<Result<ChapterDetailDto>> Handle(GetChapterDraftQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can access chapter drafts."));
        }

        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        IReadOnlyList<Block> blocks = await contentRepository.GetBlocksByChapterIdAsync(chapter.Id, cancellationToken);
        ChapterDetailDto detail = await ChapterDetailMapper.MapToDetailDtoAsync(chapter, blocks, contentRepository, cancellationToken);

        return Result.Success(detail);
    }
}
