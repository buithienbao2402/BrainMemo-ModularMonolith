using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class ChapterDeletedEventHandler : IIntegrationEventHandler<ChapterDeleted>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ILogger<ChapterDeletedEventHandler> _logger;

    public ChapterDeletedEventHandler(
        ICourseEntryRepository entryRepository,
        ILogger<ChapterDeletedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _logger = logger;
    }

    public async Task HandleAsync(ChapterDeleted @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
        if (entry is null)
        {
            return;
        }

        if (@event.WasPublished)
        {
            entry.PublishedChapterCount = Math.Max(0, entry.PublishedChapterCount - 1);
            entry.SyncedAt = DateTimeOffset.UtcNow;
            await _entryRepository.UpsertAsync(entry, ct);

            _logger.LogInformation(
                "Decremented chapter count for course {CourseId}: {Count}",
                @event.CourseId,
                entry.PublishedChapterCount);
        }
    }
}
