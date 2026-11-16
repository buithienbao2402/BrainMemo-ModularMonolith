using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Commands.EditComment;

public sealed record EditCommentCommand(
    Guid CommentId,
    string Content,
    Guid CurrentUserId) : ICommand<CommentDto>;
