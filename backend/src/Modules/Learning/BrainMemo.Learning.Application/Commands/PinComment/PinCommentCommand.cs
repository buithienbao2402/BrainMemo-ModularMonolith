using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Learning.Application.Commands.PinComment;

public sealed record PinCommentCommand(
    Guid CommentId,
    Guid CurrentUserId) : ICommand;
