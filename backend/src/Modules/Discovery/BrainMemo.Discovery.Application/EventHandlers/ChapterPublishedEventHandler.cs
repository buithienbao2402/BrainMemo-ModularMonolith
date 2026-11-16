using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class ChapterPublishedEventHandler : IIntegrationEventHandler<ChapterPublished>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ILogger<ChapterPublishedEventHandler> _logger;

    public ChapterPublishedEventHandler(
        ICourseEntryRepository entryRepository,
        ILogger<ChapterPublishedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _logger = logger;
    }

    public async Task HandleAsync(ChapterPublished @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
        if (entry is null)
        {
            return;
        }

        if (@event.IsFirstPublish)
        {
            entry.PublishedChapterCount++;
            if (entry.FirstPublishedAt is null)
            {
                entry.FirstPublishedAt = @event.OccurredAt;
            }
        }

        entry.SyncedAt = DateTimeOffset.UtcNow;
        await _entryRepository.UpsertAsync(entry, ct);

        _logger.LogInformation(
            "Updated chapter count for course {CourseId}: {Count}",
            @event.CourseId,
            entry.PublishedChapterCount);
    }
}
