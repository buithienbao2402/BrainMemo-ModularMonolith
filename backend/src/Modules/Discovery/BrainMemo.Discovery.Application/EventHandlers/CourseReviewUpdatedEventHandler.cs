using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class CourseReviewUpdatedEventHandler(
    ICourseEntryRepository entryRepository,
    ILogger<CourseReviewUpdatedEventHandler> logger) : IIntegrationEventHandler<CourseReviewUpdated>
{
    public async Task HandleAsync(CourseReviewUpdated @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        logger.LogDebug("Handling CourseReviewUpdated for course {CourseId}", @event.CourseId);

        // Created chỉ phát khi tạo mới; Updated chỉ cập nhật avg_rating, không tạo fact.
        var entry = await entryRepository.GetByIdAsync(@event.CourseId, ct).ConfigureAwait(false);
        if (entry is not null)
        {
            entry.AvgRating = @event.AvgRating;
            await entryRepository.UpsertAsync(entry, ct).ConfigureAwait(false);
        }
    }
}
