using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Learning.Application.Commands.DeleteComment;

public sealed record DeleteCommentCommand(
    Guid CommentId,
    Guid CurrentUserId) : ICommand;
