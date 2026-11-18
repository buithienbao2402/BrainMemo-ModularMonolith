using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Reviews.Queries.GetCourseReviewSummary;

public sealed record GetCourseReviewSummaryQuery(Guid CourseId) : IQuery<ReviewSummaryDto>;

public sealed class GetCourseReviewSummaryQueryHandler(IAssessmentRepository repository)
    : IQueryHandler<GetCourseReviewSummaryQuery, ReviewSummaryDto>
{
    public async Task<Result<ReviewSummaryDto>> Handle(GetCourseReviewSummaryQuery request, CancellationToken cancellationToken)
    {
        var stats = await repository.GetCourseReviewStatsAsync(request.CourseId, cancellationToken);
        return Result.Success(new ReviewSummaryDto(stats.AvgRating, stats.TotalCount, stats.Distribution));
    }
}
