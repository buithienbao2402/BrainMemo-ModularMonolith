namespace BrainMemo.Learning.Api.DTOs;

public sealed record CreateCommentRequest(
    string Content,
    Guid? ChapterId,
    Guid? ParentCommentId);

public sealed record EditCommentRequest(
    string Content);
