using BrainMemo.Discovery.Contracts.Dtos;

namespace BrainMemo.Discovery.Contracts;

public interface IDiscoveryContract
{
    Task<HomeSectionsDto> GetHomeSectionsAsync(Guid? currentUserId, CancellationToken ct = default);
    Task<PagedCourseCardsDto> SearchCoursesAsync(SearchCoursesFilter filter, Guid? currentUserId, CancellationToken ct = default);
    Task<IReadOnlyList<Top10ItemDto>> GetTop10Async(string metric, string window, CancellationToken ct = default);
    Task<IReadOnlyList<SearchHistoryItemDto>> ListSearchHistoryAsync(Guid userId, CancellationToken ct = default);
    Task<CourseRankingDto?> GetCourseRankingAsync(Guid courseId, CancellationToken ct = default);
}
