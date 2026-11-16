using BrainMemo.Assessment.Contracts.Events;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class CourseReviewCreatedEventHandler(
    ICourseEntryRepository entryRepository,
    ICourseActivityFactRepository factRepository,
    ILogger<CourseReviewCreatedEventHandler> logger) : IIntegrationEventHandler<CourseReviewCreated>
{
    public async Task HandleAsync(CourseReviewCreated @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        bool exists = await factRepository.ExistsBySourceEventIdAsync(@event.EventId, ct).ConfigureAwait(false);
        if (exists)
        {
            logger.LogInformation("Skipping duplicate CourseReviewCreated fact for EventId {EventId}", @event.EventId);
            return;
        }

        var fact = new CourseActivityFact
        {
            Id = Guid.NewGuid(),
            CourseId = @event.CourseId,
            ActivityType = "REVIEW_NEW",
            UserId = @event.UserId,
            SourceEventId = @event.EventId,
            OccurredAt = @event.OccurredAt
        };

        await factRepository.AddAsync(fact, ct).ConfigureAwait(false);

        var entry = await entryRepository.GetByIdAsync(@event.CourseId, ct).ConfigureAwait(false);
        if (entry is not null)
        {
            entry.ReviewCount = @event.ReviewCount > 0 ? @event.ReviewCount : entry.ReviewCount + 1;
            entry.AvgRating = @event.AvgRating;
            await entryRepository.UpsertAsync(entry, ct).ConfigureAwait(false);
        }
    }
}
