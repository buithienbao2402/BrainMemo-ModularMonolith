using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetChapterProgressSummary;

public sealed class GetChapterProgressSummaryQueryHandler(
    ICourseContract courseContract,
    IContentContract contentContract,
    ILearningRepository learningRepository) : IQueryHandler<GetChapterProgressSummaryQuery, ChapterProgressSummaryDto>
{
    public async Task<Result<ChapterProgressSummaryDto>> Handle(GetChapterProgressSummaryQuery request, CancellationToken ct)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(request.CourseId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<ChapterProgressSummaryDto>(accessResult.Error);
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ChapterProgressSummaryDto>(Error.Forbidden("Chỉ chủ khóa mới có quyền xem thống kê hoàn thành chương."));
        }

        Result<IReadOnlyList<ChapterInfoDto>> chapterInfo = contentContract.GetChapterInfo([request.ChapterId]);
        if (!chapterInfo.IsSuccess || chapterInfo.Value.Count == 0)
        {
            return Result.Failure<ChapterProgressSummaryDto>(Error.NotFound("Không tìm thấy chương."));
        }

        int completedLearners = await learningRepository
            .CountChapterCompletionsAsync(request.ChapterId, ct)
            .ConfigureAwait(false);

        // Get total active learners from course
        Result<BrainMemo.SharedKernel.Pagination.Page<Guid>> activeLearners = courseContract.ListActiveLearnerIds(request.CourseId, null, 1000);
        int totalLearners = activeLearners.IsSuccess ? activeLearners.Value.Items.Count : 0;

        double rate = totalLearners > 0
            ? Math.Round((double)completedLearners / totalLearners * 100.0, 2)
            : 0.0;

        return Result.Success(new ChapterProgressSummaryDto(
            ChapterId: request.ChapterId,
            CompletedLearnerCount: completedLearners,
            CompletionRate: rate));
    }
}
