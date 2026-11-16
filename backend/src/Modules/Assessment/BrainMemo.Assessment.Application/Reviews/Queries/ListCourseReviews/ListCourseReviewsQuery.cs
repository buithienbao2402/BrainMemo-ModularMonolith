using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Reviews.Queries.ListCourseReviews;

public sealed record ListCourseReviewsQuery(
    Guid CourseId,
    int Page = 1,
    int PageSize = 20) : IQuery<ReviewsListResponseDto>;

public sealed class ListCourseReviewsQueryHandler(
    IAssessmentRepository repository,
    IIdentityContract identityContract) : IQueryHandler<ListCourseReviewsQuery, ReviewsListResponseDto>
{
    public async Task<Result<ReviewsListResponseDto>> Handle(ListCourseReviewsQuery request, CancellationToken cancellationToken)
    {
        int page = request.Page < 1 ? 1 : request.Page;
        int pageSize = request.PageSize < 1 ? 20 : (request.PageSize > 100 ? 100 : request.PageSize);

        var reviews = await repository.GetReviewsByCourseIdAsync(request.CourseId, page, pageSize, cancellationToken);
        var stats = await repository.GetCourseReviewStatsAsync(request.CourseId, cancellationToken);

        var userIds = reviews.Select(r => r.UserId).Distinct().ToList();
        var usersRes = userIds.Count > 0 ? await identityContract.GetUserSummary(userIds, cancellationToken) : null;
        var userDict = usersRes?.IsSuccess == true ? usersRes.Value.ToDictionary(u => u.Id) : new();

        var items = reviews.Select(r =>
        {
            userDict.TryGetValue(r.UserId, out var u);
            var userRef = new UserRefDto(r.UserId, u?.Email ?? "Học viên", null, u?.Email);

            return new ReviewDto(
                r.Id,
                userRef,
                r.Rating,
                r.CommentText,
                r.ReplyText,
                r.RepliedAt,
                r.CreatedAt,
                r.UpdatedAt);
        }).ToList();

        int totalPages = pageSize <= 0 ? 0 : (int)Math.Ceiling(stats.TotalCount / (double)pageSize);
        var pageMeta = new PageMetaDto(page, pageSize, stats.TotalCount, totalPages);

        return Result.Success(new ReviewsListResponseDto(stats.AvgRating, stats.TotalCount, items, pageMeta));
    }
}
