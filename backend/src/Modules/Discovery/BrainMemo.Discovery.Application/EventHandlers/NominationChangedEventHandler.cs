using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class NominationChangedEventHandler : IIntegrationEventHandler<NominationChanged>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ICourseActivityFactRepository _factRepository;
    private readonly ILogger<NominationChangedEventHandler> _logger;

    public NominationChangedEventHandler(
        ICourseEntryRepository entryRepository,
        ICourseActivityFactRepository factRepository,
        ILogger<NominationChangedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _factRepository = factRepository;
        _logger = logger;
    }

    public async Task HandleAsync(NominationChanged @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        bool exists = await _factRepository.ExistsBySourceEventIdAsync(@event.EventId, ct);
        if (exists)
        {
            _logger.LogInformation(
                "Skipping duplicate NominationChanged fact for EventId {EventId}",
                @event.EventId);
            return;
        }

        string activityType = @event.IsActive ? "NOMINATION_NEW" : "NOMINATION_WITHDRAWN";

        CourseActivityFact fact = new()
        {
            Id = Guid.NewGuid(),
            CourseId = @event.CourseId,
            ActivityType = activityType,
            UserId = @event.UserId,
            SourceEventId = @event.EventId,
            OccurredAt = @event.OccurredAt,
        };

        await _factRepository.AddAsync(fact, ct);

        CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
        if (entry is not null)
        {
            if (@event.IsActive)
            {
                entry.NominationCount++;
            }
            else
            {
                entry.NominationCount = Math.Max(0, entry.NominationCount - 1);
            }

            entry.SyncedAt = DateTimeOffset.UtcNow;
            await _entryRepository.UpsertAsync(entry, ct);
        }
    }
}
