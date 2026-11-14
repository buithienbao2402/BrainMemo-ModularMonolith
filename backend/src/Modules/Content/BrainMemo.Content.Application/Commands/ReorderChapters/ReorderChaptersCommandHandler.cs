using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.ReorderChapters;

public sealed class ReorderChaptersCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<ReorderChaptersCommand>
{
    public async Task<Result> Handle(ReorderChaptersCommand request, CancellationToken cancellationToken)
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
            return Result.Failure(new Error("FORBIDDEN", "Only the course owner can reorder chapters."));
        }

        IReadOnlyList<Chapter> chapters = await contentRepository.ListChaptersByCourseIdAsync(
            request.CourseId,
            includeDrafts: true,
            cancellationToken);

        var chapterMap = chapters.ToDictionary(c => c.Id);

        for (int i = 0; i < request.ChapterIds.Count; i++)
        {
            Guid id = request.ChapterIds[i];
            if (chapterMap.TryGetValue(id, out Chapter? chapter))
            {
                chapter.Reorder(i + 1);
                await contentRepository.UpdateChapterAsync(chapter, cancellationToken);
            }
        }

        await contentRepository.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
