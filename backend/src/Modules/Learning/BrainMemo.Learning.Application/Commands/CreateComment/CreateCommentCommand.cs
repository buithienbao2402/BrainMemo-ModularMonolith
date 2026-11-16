using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Commands.CreateComment;

public sealed record CreateCommentCommand(
    Guid CourseId,
    Guid? ChapterId,
    Guid? ParentCommentId,
    string Content,
    Guid CurrentUserId) : ICommand<CommentDto>;
