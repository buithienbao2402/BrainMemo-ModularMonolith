using BrainMemo.Course.Contracts;
using BrainMemo.Moderation.Application.Abstractions;
using BrainMemo.Moderation.Application.DTOs;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using MediatR;

namespace BrainMemo.Moderation.Application.Queries.GetDashboard;

public sealed record GetModerationDashboardQuery : IRequest<Result<ModerationDashboardDto>>;

public sealed class GetModerationDashboardQueryHandler(
    IModerationRepository repository,
    IClock clock,
    ICourseContract? courseContract = null) : IRequestHandler<GetModerationDashboardQuery, Result<ModerationDashboardDto>>
{
    public async Task<Result<ModerationDashboardDto>> Handle(GetModerationDashboardQuery query, CancellationToken ct)
    {
        DateTimeOffset utcNow = clock.UtcNow;
        ModerationDashboardDto stats = await repository.GetDashboardStatsAsync(utcNow, ct).ConfigureAwait(false);

        int pendingReviews = 0;
        if (courseContract != null)
        {
            var reviewResult = courseContract.CountPendingCourseReviews();
            if (reviewResult.IsSuccess)
            {
                pendingReviews = reviewResult.Value;
            }
        }

        return Result.Success(stats with { PendingCourseReviews = pendingReviews });
    }
}
