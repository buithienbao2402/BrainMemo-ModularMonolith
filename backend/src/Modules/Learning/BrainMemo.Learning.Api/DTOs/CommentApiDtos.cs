namespace BrainMemo.Learning.Api.DTOs;

public sealed record CreateCommentRequest(
    string Content,
    Guid? ChapterId,
    Guid? ParentCommentId,
    string? Title = null,
    Guid? BlockId = null);

public sealed record EditCommentRequest(
    string Content,
    string? Title = null);

public sealed record ResolveCommentRequest(
    Guid? ResolvedCommentId = null);
