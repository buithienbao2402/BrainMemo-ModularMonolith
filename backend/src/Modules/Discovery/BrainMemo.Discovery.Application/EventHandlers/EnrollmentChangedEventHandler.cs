using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class EnrollmentChangedEventHandler : IIntegrationEventHandler<EnrollmentChanged>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ICourseActivityFactRepository _factRepository;
    private readonly ILogger<EnrollmentChangedEventHandler> _logger;

    public EnrollmentChangedEventHandler(
        ICourseEntryRepository entryRepository,
        ICourseActivityFactRepository factRepository,
        ILogger<EnrollmentChangedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _factRepository = factRepository;
        _logger = logger;
    }

    public async Task HandleAsync(EnrollmentChanged @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        // Idempotency: source_event_id check
        bool exists = await _factRepository.ExistsBySourceEventIdAsync(@event.EventId, ct);
        if (exists)
        {
            _logger.LogInformation(
                "Skipping duplicate EnrollmentChanged fact for EventId {EventId}",
                @event.EventId);
            return;
        }

        string toStatus = @event.ToStatus ?? @event.NewStatus ?? string.Empty;
        string fromStatus = @event.FromStatus ?? @event.PreviousStatus ?? string.Empty;

        // Khi chuyển sang ACTIVE (bao gồm ghi danh mới và ghi danh lại)
        if (string.Equals(toStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            CourseActivityFact fact = new()
            {
                Id = Guid.NewGuid(),
                CourseId = @event.CourseId,
                ActivityType = "ENROLLMENT_NEW",
                UserId = @event.UserId,
                SourceEventId = @event.EventId,
                OccurredAt = @event.OccurredAt,
            };

            await _factRepository.AddAsync(fact, ct);

            CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
            if (entry is not null)
            {
                entry.LearnerCount++;
                entry.SyncedAt = DateTimeOffset.UtcNow;
                await _entryRepository.UpsertAsync(entry, ct);
            }
        }
        else if (string.Equals(fromStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
        {
            // Học viên rời khỏi hoặc bị xóa khỏi khóa
            CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
            if (entry is not null)
            {
                entry.LearnerCount = Math.Max(0, entry.LearnerCount - 1);
                entry.SyncedAt = DateTimeOffset.UtcNow;
                await _entryRepository.UpsertAsync(entry, ct);
            }
        }
    }
}
