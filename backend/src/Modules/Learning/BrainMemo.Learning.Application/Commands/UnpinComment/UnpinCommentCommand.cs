using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Learning.Application.Commands.UnpinComment;

public sealed record UnpinCommentCommand(
    Guid CommentId,
    Guid CurrentUserId) : ICommand;
