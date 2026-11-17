using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Pagination;

namespace BrainMemo.Learning.Application.Queries.ListComments;

public sealed record ListCommentsQuery(
    Guid CourseId,
    Guid? ChapterId,
    int Page,
    int PageSize,
    Guid? CurrentUserId,
    bool? IsResolved = null,
    bool? Mine = null,
    string? Search = null) : IQuery<PagedResult<CommentDto>>;
