using System.Text.Json.Serialization;

namespace BrainMemo.Discovery.Contracts.Dtos;

public sealed record UserRefDto(
    Guid Id,
    string DisplayName,
    string? AvatarUrl = null);

public sealed record CourseCardDto(
    Guid Id,
    string Name,
    string? CoverUrl,
    UserRefDto Owner,
    string AccessMode,
    string Status,
    IReadOnlyList<string> Tags,
    int LearnerCount,
    double? RatingAvg,
    int RatingCount,
    int NominationCount,
    double? ProgressPercent = null);

public sealed record HomeSectionsDto(
    IReadOnlyList<CourseCardDto> RecentlyUpdated,
    IReadOnlyList<CourseCardDto> Recommended,
    IReadOnlyList<CourseCardDto> InProgress);

public sealed record Top10ItemDto(
    int Rank,
    int Count,
    CourseCardDto Course);

public sealed record SearchHistoryItemDto(
    string QueryText,
    DateTimeOffset CreatedAt);

public sealed record PageMetaDto(
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed record PagedCourseCardsDto(
    IReadOnlyList<CourseCardDto> Items,
    PageMetaDto Meta);

public sealed record CourseRankingDto(
    Guid CourseId,
    int LearnerRank,
    int NominationRank,
    int ReviewRank,
    int LearnerCount,
    int NominationCount,
    int ReviewCount,
    int TotalEligibleCourses);

public sealed record SearchCoursesFilter(
    string? Q = null,
    string? Tag = null,
    string? AccessMode = null,
    string? Status = null,
    string? Sort = null,
    int Page = 1,
    int PageSize = 20);
