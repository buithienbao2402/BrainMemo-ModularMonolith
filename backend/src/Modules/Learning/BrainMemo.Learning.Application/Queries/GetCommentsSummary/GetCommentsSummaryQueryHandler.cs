using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetCommentsSummary;

public sealed class GetCommentsSummaryQueryHandler(
    ILearningRepository learningRepository) : IQueryHandler<GetCommentsSummaryQuery, CommentsSummaryDto>
{
    public async Task<Result<CommentsSummaryDto>> Handle(GetCommentsSummaryQuery request, CancellationToken ct)
    {
        int total = await learningRepository.CountCommentsAsync(request.CourseId, request.ChapterId, ct).ConfigureAwait(false);
        int root = await learningRepository.CountRootCommentsAsync(request.CourseId, request.ChapterId, ct).ConfigureAwait(false);
        int pinned = await learningRepository.CountPinnedCommentsAsync(request.CourseId, ct).ConfigureAwait(false);

        return Result.Success(new CommentsSummaryDto(total, root, pinned));
    }
}
