namespace BrainMemo.Learning.Application.DTOs;

public sealed record UserRefDto(
    Guid Id,
    string DisplayName,
    string? AvatarUrl);

public sealed record CommentDto(
    Guid Id,
    Guid CourseId,
    Guid? ChapterId,
    UserRefDto Author,
    Guid? ParentCommentId,
    string Content,
    bool IsPinned,
    DateTimeOffset? EditedAt,
    DateTimeOffset CreatedAt,
    IReadOnlyList<CommentDto> Replies,
    string? Title = null,
    Guid? BlockId = null,
    bool IsResolved = false,
    DateTimeOffset? ResolvedAt = null,
    Guid? ResolvedByUserId = null,
    Guid? ResolvedCommentId = null,
    bool IsInstructorReply = false);

public sealed record CommentsSummaryDto(
    int TotalComments,
    int RootComments,
    int PinnedComments,
    int ResolvedComments = 0);
