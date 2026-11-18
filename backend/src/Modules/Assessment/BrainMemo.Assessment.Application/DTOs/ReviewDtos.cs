using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Assessment.Application.DTOs;

public sealed record UserRefDto(
    Guid Id,
    string DisplayName,
    string? AvatarUrl = null,
    string? Email = null);

public sealed record ReviewDto(
    Guid Id,
    UserRefDto User,
    int Rating,
    string? CommentText,
    string? ReplyText,
    DateTimeOffset? RepliedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PageMetaDto(
    int Page,
    int PageSize,
    int Total,
    int TotalPages);

public sealed record ReviewsListResponseDto(
    decimal? Avg,
    int Count,
    IReadOnlyList<ReviewDto> Items,
    PageMetaDto Meta);

public sealed record ReviewSummaryDto(
    decimal? AvgRating,
    int ReviewCount,
    IReadOnlyDictionary<int, int> RatingDistribution);

public sealed record UpsertReviewRequest(
    int Rating,
    string? CommentText);

public sealed record ReplyReviewRequest(
    string ReplyText);
