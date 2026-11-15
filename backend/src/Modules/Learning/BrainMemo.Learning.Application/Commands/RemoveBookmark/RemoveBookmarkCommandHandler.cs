using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.RemoveBookmark;

public sealed class RemoveBookmarkCommandHandler(
    ILearningRepository learningRepository) : ICommandHandler<RemoveBookmarkCommand>
{
    public async Task<Result> Handle(RemoveBookmarkCommand request, CancellationToken ct)
    {
        Bookmark? existing = await learningRepository
            .GetBookmarkAsync(request.CurrentUserId, request.CourseId, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            await learningRepository.RemoveBookmarkAsync(existing, ct).ConfigureAwait(false);
            await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        return Result.Success();
    }
}
