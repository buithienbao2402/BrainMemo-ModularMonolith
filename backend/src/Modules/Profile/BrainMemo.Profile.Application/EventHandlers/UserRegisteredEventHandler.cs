using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Identity.Contracts.Events;
using BrainMemo.Profile.Application.Abstractions;
using BrainMemo.Profile.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Profile.Application.EventHandlers;

/// <summary>
/// Idempotently provisions a default UserProfile when a UserRegistered integration event is received.
/// </summary>
public sealed class UserRegisteredEventHandler(
    IProfileRepository profileRepository,
    IClock clock,
    ILogger<UserRegisteredEventHandler> logger) : IIntegrationEventHandler<UserRegistered>
{
    public async Task HandleAsync(UserRegistered @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        UserProfile? existing = await profileRepository
            .FindByUserIdAsync(@event.UserId, ct)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            logger.LogInformation("Profile already exists for user {UserId}. Skipping default profile creation.", @event.UserId);
            return;
        }

        DateTimeOffset utcNow = clock.UtcNow;
        Result<UserProfile> createResult = !string.IsNullOrWhiteSpace(@event.DisplayName)
            ? UserProfile.Create(
                @event.UserId,
                @event.DisplayName,
                avatarStorageKey: null,
                bio: null,
                showCourseList: true,
                uiTheme: BrainMemo.Profile.Domain.Enums.UiTheme.Light,
                utcNow)
            : UserProfile.CreateDefault(@event.UserId, utcNow);

        if (createResult.IsFailure)
        {
            logger.LogError("Failed to create profile for user {UserId}: {Error}", @event.UserId, createResult.Error);
            return;
        }

        Result saveResult = await profileRepository
            .AddAsync(createResult.Value, ct)
            .ConfigureAwait(false);

        if (saveResult.IsFailure)
        {
            logger.LogWarning("Profile creation for user {UserId} encountered: {Error}. Idempotency preserved.", @event.UserId, saveResult.Error);
        }
        else
        {
            logger.LogInformation("Successfully created default profile for user {UserId}.", @event.UserId);
        }
    }
}
