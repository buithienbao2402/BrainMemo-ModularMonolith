using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Contracts;
using BrainMemo.SharedKernel.Results;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Queries.GetCourseStats;

public sealed class GetCourseStatsQueryHandler(
    ICourseRepository courseRepository,
    IContentContract contentContract,
    ILearningContract learningContract) : IQueryHandler<GetCourseStatsQuery, CourseStatsDto>
{
    public async Task<Result<CourseStatsDto>> Handle(GetCourseStatsQuery request, CancellationToken ct)
    {
        CourseEntity? course = await courseRepository.GetByIdAsync(request.CourseId, ct).ConfigureAwait(false);
        if (course is null)
        {
            return Result.Failure<CourseStatsDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (course.OwnerUserId != request.CurrentUserId)
        {
            return Result.Failure<CourseStatsDto>(Error.Forbidden("Chỉ chủ khóa mới có quyền xem thống kê."));
        }

        int activeLearners = await courseRepository.GetLearnerCountAsync(request.CourseId, ct).ConfigureAwait(false);
        int nominationCount = await courseRepository.GetNominationCountAsync(request.CourseId, ct).ConfigureAwait(false);

        int chapterCount = 0;
        var chaptersResult = contentContract.CountPublishedChapters(request.CourseId);
        if (chaptersResult.IsSuccess)
        {
            chapterCount = chaptersResult.Value;
        }

        int completedLearners = 0;
        int commentCount = 0;
        var learningStatsResult = learningContract.GetCourseLearningStats(request.CourseId);
        if (learningStatsResult.IsSuccess && learningStatsResult.Value is not null)
        {
            completedLearners = learningStatsResult.Value.CompletedLearnerCount;
            commentCount = learningStatsResult.Value.CommentCount;
        }

        double completionRate = activeLearners == 0
            ? 0.0
            : Math.Round((double)completedLearners / activeLearners * 100.0, 2);

        CourseStatsDto stats = new(
            ActiveLearners: activeLearners,
            CompletedLearners: completedLearners,
            CompletionRate: completionRate,
            CommentCount: commentCount,
            ChapterCount: chapterCount,
            NominationCount: nominationCount);

        return Result.Success(stats);
    }
}

