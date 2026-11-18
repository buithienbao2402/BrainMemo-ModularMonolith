using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Profile.Contracts;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.EventHandlers;

public sealed class CourseUpsertedEventHandler : IIntegrationEventHandler<CourseUpserted>
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly IProfileContract? _profileContract;
    private readonly ILogger<CourseUpsertedEventHandler> _logger;

    public CourseUpsertedEventHandler(
        ICourseEntryRepository entryRepository,
        ILogger<CourseUpsertedEventHandler> logger,
        IProfileContract? profileContract = null)
    {
        _entryRepository = entryRepository;
        _logger = logger;
        _profileContract = profileContract;
    }

    public async Task HandleAsync(CourseUpserted @event, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(@event);

        // Quy tắc hiển thị (mục 3.6.1 & D18):
        // Nếu eligible = false (Only Me, Tạm ẩn, Đã xóa, Draft) -> XÓA khỏi dsc_course_entry
        if (!@event.Eligible)
        {
            _logger.LogInformation(
                "Course {CourseId} is not eligible for discovery. Deleting entry.",
                @event.CourseId);

            await _entryRepository.DeleteAsync(@event.CourseId, ct);
            return;
        }

        CourseEntry? existing = await _entryRepository.GetByIdAsync(@event.CourseId, ct);

        // Chống event cũ đến muộn: nếu revision của event <= source_revision hiện tại -> bỏ qua
        if (existing is not null && @event.Revision <= existing.SourceRevision)
        {
            _logger.LogInformation(
                "Ignoring stale CourseUpserted event for course {CourseId}. Event revision {EventRev} <= existing revision {ExistingRev}.",
                @event.CourseId,
                @event.Revision,
                existing.SourceRevision);
            return;
        }

        Guid ownerId = @event.OwnerUserId ?? existing?.OwnerUserId ?? Guid.Empty;
        string displayName = existing?.OwnerDisplayName ?? string.Empty;

        // Cập nhật tên chủ khóa nếu chưa có hoặc owner thay đổi
        if (string.IsNullOrWhiteSpace(displayName) && ownerId != Guid.Empty && _profileContract is not null)
        {
            try
            {
                var profileResult = await _profileContract.GetDisplayInfo([ownerId], ct);
                if (profileResult.IsSuccess && profileResult.Value.Count > 0)
                {
                    displayName = profileResult.Value[0].DisplayName;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve owner display name for user {UserId}", ownerId);
            }
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = "Tác giả";
        }

        CourseEntry entry = existing ?? new CourseEntry
        {
            CourseId = @event.CourseId,
            LearnerCount = 0,
            ReviewCount = 0,
            NominationCount = 0,
            CommentCount = 0,
            PublishedChapterCount = 0,
        };

        entry.OwnerUserId = ownerId;
        entry.OwnerDisplayName = displayName;
        entry.Name = @event.Name ?? existing?.Name ?? string.Empty;
        entry.Description = @event.Description;
        entry.AccessMode = @event.AccessMode ?? existing?.AccessMode ?? "PUBLIC";
        entry.CourseStatus = @event.Status ?? existing?.CourseStatus ?? "UPDATING";
        entry.TagList = @event.Tags ?? existing?.TagList;
        entry.SourceRevision = @event.Revision;
        entry.LastUpdatedAt = @event.OccurredAt;
        entry.SyncedAt = DateTimeOffset.UtcNow;

        await _entryRepository.UpsertAsync(entry, ct);

        _logger.LogInformation(
            "Upserted course entry {CourseId} (Revision: {Revision}, Name: {Name})",
            @event.CourseId,
            @event.Revision,
            entry.Name);
    }
}
