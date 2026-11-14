using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.CreateChapter;

public sealed class CreateChapterCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<CreateChapterCommand, ChapterDetailDto>
{
    public async Task<Result<ChapterDetailDto>> Handle(CreateChapterCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify owner permission
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
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can create chapters."));
        }

        int maxPosition = await contentRepository.GetMaxChapterPositionAsync(request.CourseId, cancellationToken);
        int nextPosition = maxPosition + 1;

        Result<Chapter> chapterResult = Chapter.Create(
            request.CourseId,
            request.Title,
            request.Description,
            nextPosition);

        if (chapterResult.IsFailure)
        {
            return Result.Failure<ChapterDetailDto>(chapterResult.Error);
        }

        Chapter chapter = chapterResult.Value;
        await contentRepository.AddChapterAsync(chapter, cancellationToken);

        // Create initial v1 empty snapshot
        var initialSnapshotObj = new
        {
            schemaVersion = 1,
            title = chapter.Title,
            description = chapter.Description,
            blocks = Array.Empty<object>()
        };
        string initialSnapshot = JsonSerializer.Serialize(initialSnapshotObj);

        var version = new ChapterVersion(Guid.NewGuid(), chapter.Id, 1, initialSnapshot);
        await contentRepository.AddChapterVersionAsync(version, cancellationToken);

        await contentRepository.SaveChangesAsync(cancellationToken);

        var dto = new ChapterDetailDto(
            chapter.Id,
            chapter.CourseId,
            chapter.Position,
            chapter.Title,
            chapter.Description,
            chapter.Status.ToString().ToUpperInvariant(),
            chapter.LastVersionNo,
            chapter.PublishedVersionNo,
            []);

        return Result.Success(dto);
    }
}
