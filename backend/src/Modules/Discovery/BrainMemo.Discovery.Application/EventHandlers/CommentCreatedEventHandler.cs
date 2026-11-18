using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Learning.Contracts.Events;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class CommentCreatedEventHandler : IIntegrationEventHandler<CommentCreated>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ILogger<CommentCreatedEventHandler> _logger;

    public CommentCreatedEventHandler(
        ICourseEntryRepository entryRepository,
        ILogger<CommentCreatedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _logger = logger;
    }

    public async Task HandleAsync(CommentCreated @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        CourseEntry? entry = await _entryRepository.GetByIdAsync(@event.CourseId, ct);
        if (entry is null)
        {
            return;
        }

        entry.CommentCount++;
        entry.SyncedAt = DateTimeOffset.UtcNow;
        await _entryRepository.UpsertAsync(entry, ct);
    }
}
