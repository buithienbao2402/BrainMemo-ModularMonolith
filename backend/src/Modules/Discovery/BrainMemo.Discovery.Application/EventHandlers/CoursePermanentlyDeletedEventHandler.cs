using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class CoursePermanentlyDeletedEventHandler : IIntegrationEventHandler<CoursePermanentlyDeleted>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ICourseActivityFactRepository _factRepository;
    private readonly ILogger<CoursePermanentlyDeletedEventHandler> _logger;

    public CoursePermanentlyDeletedEventHandler(
        ICourseEntryRepository entryRepository,
        ICourseActivityFactRepository factRepository,
        ILogger<CoursePermanentlyDeletedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _factRepository = factRepository;
        _logger = logger;
    }

    public async Task HandleAsync(CoursePermanentlyDeleted @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        _logger.LogInformation(
            "Course {CourseId} permanently deleted. Purging entry and activity facts.",
            @event.CourseId);

        await _entryRepository.DeleteAsync(@event.CourseId, ct);
        await _factRepository.DeleteByCourseIdAsync(@event.CourseId, ct);
    }
}
