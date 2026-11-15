using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Learning.Application.Commands.SetBookmark;

public sealed class SetBookmarkCommandHandler(
    ILearningRepository learningRepository,
    IClock clock) : ICommandHandler<SetBookmarkCommand>
{
    public async Task<Result> Handle(SetBookmarkCommand request, CancellationToken ct)
    {
        DateTimeOffset now = clock.UtcNow;
        Bookmark? existing = await learningRepository
            .GetBookmarkAsync(request.CurrentUserId, request.CourseId, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            existing.UpdateChapter(request.ChapterId, now);
        }
        else
        {
            Bookmark bookmark = new(
                id: Guid.NewGuid(),
                userId: request.CurrentUserId,
                courseId: request.CourseId,
                chapterId: request.ChapterId,
                createdAt: now,
                updatedAt: now);

            await learningRepository.AddBookmarkAsync(bookmark, ct).ConfigureAwait(false);
        }

        await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success();
    }
}
