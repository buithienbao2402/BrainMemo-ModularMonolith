using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Application.EventHandlers;

public sealed class ChapterDeletedEventHandler(
    ICourseRepository courseRepository,
    ILogger<ChapterDeletedEventHandler>? logger = null) : IIntegrationEventHandler<ChapterDeleted>
{
    public async Task HandleAsync(ChapterDeleted @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        try
        {
            ChapterAccess? access = await courseRepository.GetChapterAccessAsync(@event.ChapterId, ct).ConfigureAwait(false);
            if (access is not null)
            {
                await courseRepository.RemoveChapterAccessAsync(access, ct).ConfigureAwait(false);
            }

            await courseRepository.RemoveChapterUnlocksByChapterIdAsync(@event.ChapterId, ct).ConfigureAwait(false);
            await courseRepository.SaveChangesAsync(ct).ConfigureAwait(false);

            logger?.LogInformation(
                "Removed access settings and unlocks for deleted chapter {ChapterId} in course {CourseId}.",
                @event.ChapterId,
                @event.CourseId);
        }
        catch (Exception ex)
        {
            logger?.LogError(
                ex,
                "Error cleaning up chapter access for deleted chapter {ChapterId}.",
                @event.ChapterId);
            // Idempotent: safe to fail without breaking pipeline
        }
    }
}
