using BrainMemo.Course.Contracts;
using CourseSnapshotDto = BrainMemo.Course.Contracts.Dtos.CourseSnapshotDto;
using BrainMemo.Discovery.Contracts;
using BrainMemo.Discovery.Contracts.Dtos;
using BrainMemo.Discovery.Domain.Entities;
using BrainMemo.Discovery.Domain.Repositories;
using BrainMemo.Learning.Contracts;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Discovery.Application.Services;

public sealed class DiscoveryService : IDiscoveryContract
{
    private readonly ICourseEntryRepository _entryRepository;
    private readonly ICourseActivityFactRepository _factRepository;
    private readonly ISearchHistoryRepository _searchHistoryRepository;
    private readonly ILearningContract? _learningContract;
    private readonly ICourseContract? _courseContract;
    private readonly ILogger<DiscoveryService> _logger;

    public DiscoveryService(
        ICourseEntryRepository entryRepository,
        ICourseActivityFactRepository factRepository,
        ISearchHistoryRepository searchHistoryRepository,
        ILogger<DiscoveryService> logger,
        ILearningContract? learningContract = null,
        ICourseContract? courseContract = null)
    {
        _entryRepository = entryRepository;
        _factRepository = factRepository;
        _searchHistoryRepository = searchHistoryRepository;
        _logger = logger;
        _learningContract = learningContract;
        _courseContract = courseContract;
    }

    public async Task<HomeSectionsDto> GetHomeSectionsAsync(Guid? currentUserId, CancellationToken ct = default)
    {
        // 1. Mới cập nhật (FR-DSC-01): Top 10 last_updated_at DESC
        IReadOnlyList<CourseEntry> recentlyUpdatedEntries = await _entryRepository.GetRecentlyUpdatedAsync(10, ct);
        List<CourseCardDto> recentlyUpdated = recentlyUpdatedEntries.Select(MapToCard).ToList();

        // 2. Đề xuất NGẪU NHIÊN mỗi lần tải, độc lập người dùng (FR-DSC-02)
        IReadOnlyList<CourseEntry> recommendedEntries = await _entryRepository.GetRecommendedRandomAsync(10, ct);
        List<CourseCardDto> recommended = recommendedEntries.Select(MapToCard).ToList();

        // 3. Đang học dở nếu đăng nhập (FR-DSC-03)
        List<CourseCardDto> inProgress = [];
        if (currentUserId.HasValue && _learningContract is not null)
        {
            try
            {
                var inProgressResult = _learningContract.ListInProgressCourses(currentUserId.Value, null, 10);
                if (inProgressResult.IsSuccess && inProgressResult.Value.Items.Count > 0)
                {
                    IReadOnlyList<CourseEntry> inProgressEntries = await _entryRepository.GetByIdsAsync(
                        inProgressResult.Value.Items,
                        ct);

                    inProgress = inProgressEntries.Select(MapToCard).ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve in-progress courses for user {UserId}", currentUserId.Value);
            }
        }

        return new HomeSectionsDto(recentlyUpdated, recommended, inProgress);
    }

    public async Task<PagedCourseCardsDto> SearchCoursesAsync(
        SearchCoursesFilter filter,
        Guid? currentUserId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(filter);

        // Lưu lịch sử tìm kiếm nếu đã đăng nhập và q không rỗng (FR-DSC-05)
        if (currentUserId.HasValue && !string.IsNullOrWhiteSpace(filter.Q))
        {
            try
            {
                await _searchHistoryRepository.AddAsync(new SearchHistory
                {
                    Id = Guid.NewGuid(),
                    UserId = currentUserId.Value,
                    QueryText = filter.Q.Trim(),
                    CreatedAt = DateTimeOffset.UtcNow,
                }, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record search history for user {UserId}", currentUserId.Value);
            }
        }

        int page = Math.Max(1, filter.Page);
        int pageSize = Math.Clamp(filter.PageSize, 1, 50); // Phân trang <= 50 (NFR-03)

        (IReadOnlyList<CourseEntry> items, int totalCount) = await _entryRepository.SearchAsync(
            filter.Q,
            filter.Tag,
            filter.AccessMode,
            filter.Status,
            filter.Sort,
            page,
            pageSize,
            ct);

        int totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        List<CourseCardDto> cards = items.Select(MapToCard).ToList();
        PageMetaDto meta = new(page, pageSize, totalCount, totalPages);

        return new PagedCourseCardsDto(cards, meta);
    }

    public async Task<IReadOnlyList<Top10ItemDto>> GetTop10Async(
        string metric,
        string window,
        CancellationToken ct = default)
    {
        DateTimeOffset? since = window?.ToUpperInvariant() switch
        {
            "WEEK" => DateTimeOffset.UtcNow.AddDays(-7),
            "MONTH" => DateTimeOffset.UtcNow.AddDays(-30),
            _ => null, // ALL_TIME
        };

        IReadOnlyList<(Guid CourseId, int Count)> topFacts = await _factRepository.GetTop10Async(
            metric?.ToUpperInvariant() ?? "LEARNERS",
            since,
            10,
            ct);

        if (topFacts.Count == 0)
        {
            return [];
        }

        List<Guid> courseIds = topFacts.Select(f => f.CourseId).ToList();
        IReadOnlyList<CourseEntry> entries = await _entryRepository.GetByIdsAsync(courseIds, ct);
        Dictionary<Guid, CourseEntry> entryMap = entries.ToDictionary(e => e.CourseId);

        List<Top10ItemDto> results = [];
        int rank = 1;
        foreach ((Guid courseId, int count) in topFacts)
        {
            // Chỉ trả về nếu khóa học còn đủ điều kiện trong dsc_course_entry (FR-DSC-10)
            if (entryMap.TryGetValue(courseId, out CourseEntry? entry))
            {
                results.Add(new Top10ItemDto(rank++, count, MapToCard(entry)));
            }
        }

        return results;
    }

    public async Task<IReadOnlyList<SearchHistoryItemDto>> ListSearchHistoryAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        IReadOnlyList<SearchHistory> history = await _searchHistoryRepository.GetRecentByUserIdAsync(userId, 20, ct);
        return history.Select(h => new SearchHistoryItemDto(h.QueryText, h.CreatedAt)).ToList();
    }

    public async Task<CourseRankingDto?> GetCourseRankingAsync(Guid courseId, CancellationToken ct = default)
    {
        CourseEntry? entry = await _entryRepository.GetByIdAsync(courseId, ct);
        if (entry is null)
        {
            return null;
        }

        int totalEligible = await _entryRepository.CountEligibleCoursesAsync(ct);
        int learnerRank = await _entryRepository.GetRankByLearnerCountAsync(courseId, ct);
        int nominationRank = await _entryRepository.GetRankByNominationCountAsync(courseId, ct);
        int reviewRank = await _entryRepository.GetRankByReviewCountAsync(courseId, ct);

        return new CourseRankingDto(
            courseId,
            learnerRank,
            nominationRank,
            reviewRank,
            entry.LearnerCount,
            entry.NominationCount,
            entry.ReviewCount,
            totalEligible);
    }

    public async Task<int> RebuildReadModelAsync(CancellationToken ct = default)
    {
        if (_courseContract is null)
        {
            _logger.LogWarning("Cannot rebuild Discovery read model: ICourseContract not available.");
            return 0;
        }

        _logger.LogInformation("Starting Discovery read model rebuild...");
        int processedCount = 0;
        Guid? afterId = null;

        while (!ct.IsCancellationRequested)
        {
            var snapshotResult = _courseContract.ListCourseSnapshots(afterId, 50);
            if (!snapshotResult.IsSuccess || snapshotResult.Value.Items.Count == 0)
            {
                break;
            }

            foreach (CourseSnapshotDto snapshot in snapshotResult.Value.Items)
            {
                bool eligible = (snapshot.AccessMode == "PUBLIC" || snapshot.AccessMode == "PRIVATE")
                    && (snapshot.Status == "UPDATING" || snapshot.Status == "COMPLETED" || snapshot.Status == "PAUSED");

                if (!eligible)
                {
                    await _entryRepository.DeleteAsync(snapshot.Id, ct);
                    continue;
                }

                CourseEntry? existing = await _entryRepository.GetByIdAsync(snapshot.Id, ct);
                CourseEntry entry = existing ?? new CourseEntry
                {
                    CourseId = snapshot.Id,
                    OwnerUserId = snapshot.OwnerUserId,
                    OwnerDisplayName = "Tác giả",
                };

                entry.Name = snapshot.Name;
                entry.Description = snapshot.Description;
                entry.AccessMode = snapshot.AccessMode;
                entry.CourseStatus = snapshot.Status;
                entry.TagList = snapshot.Tags;
                entry.SourceRevision = snapshot.Revision;
                entry.LastUpdatedAt = snapshot.UpdatedAt;
                entry.SyncedAt = DateTimeOffset.UtcNow;

                await _entryRepository.UpsertAsync(entry, ct);
                processedCount++;
            }

            afterId = snapshotResult.Value.Items[^1].Id;
        }

        _logger.LogInformation("Discovery read model rebuild completed. Processed {Count} courses.", processedCount);
        return processedCount;
    }

    private static CourseCardDto MapToCard(CourseEntry entry)
    {
        return new CourseCardDto(
            entry.CourseId,
            entry.Name,
            entry.CoverStorageKey,
            new UserRefDto(entry.OwnerUserId, entry.OwnerDisplayName),
            entry.AccessMode,
            entry.CourseStatus,
            entry.TagList ?? [],
            entry.LearnerCount,
            entry.AvgRating.HasValue ? (double)entry.AvgRating.Value : null,
            entry.ReviewCount,
            entry.NominationCount,
            null);
    }
}
