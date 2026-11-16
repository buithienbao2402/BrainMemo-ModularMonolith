using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;

namespace BrainMemo.Learning.Application.Queries.GetCommentsSummary;

public sealed record GetCommentsSummaryQuery(
    Guid CourseId,
    Guid? ChapterId) : IQuery<CommentsSummaryDto>;
