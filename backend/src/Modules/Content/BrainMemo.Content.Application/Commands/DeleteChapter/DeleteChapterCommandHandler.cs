using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.DeleteChapter;

public sealed class DeleteChapterCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IEventBus eventBus) : ICommandHandler<DeleteChapterCommand>
{
    public async Task<Result> Handle(DeleteChapterCommand request, CancellationToken cancellationToken)
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
            return Result.Failure(new Error("FORBIDDEN", "Only the course owner can delete chapters."));
        }

        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        bool wasPublished = chapter.Status == ChapterStatus.Published || chapter.PublishedVersionNo.HasValue;

        chapter.SoftDelete();
        await contentRepository.DeletePublishedBlocksByChapterIdAsync(chapter.Id, cancellationToken);
        await contentRepository.UpdateChapterAsync(chapter, cancellationToken);
        await contentRepository.SaveChangesAsync(cancellationToken);

        await eventBus.Publish(new ChapterDeleted(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            chapter.Id,
            chapter.CourseId,
            wasPublished), cancellationToken);

        return Result.Success();
    }
}
