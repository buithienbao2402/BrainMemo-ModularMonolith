using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Profile.Contracts.Events;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class ProfileUpdatedEventHandler : IIntegrationEventHandler<ProfileUpdated>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ILogger<ProfileUpdatedEventHandler> _logger;

    public ProfileUpdatedEventHandler(
        ICourseEntryRepository entryRepository,
        ILogger<ProfileUpdatedEventHandler> logger)
    {
        _entryRepository = entryRepository;
        _logger = logger;
    }

    public async Task HandleAsync(ProfileUpdated @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        IReadOnlyList<CourseEntry> userCourses = await _entryRepository.GetByOwnerUserIdAsync(
            @event.UserId,
            ct);

        foreach (CourseEntry entry in userCourses)
        {
            entry.OwnerDisplayName = @event.DisplayName;
            entry.SyncedAt = DateTimeOffset.UtcNow;
            await _entryRepository.UpsertAsync(entry, ct);
        }

        _logger.LogInformation(
            "Updated owner display name to {DisplayName} for {Count} courses of user {UserId}",
            @event.DisplayName,
            userCourses.Count,
            @event.UserId);
    }
}
