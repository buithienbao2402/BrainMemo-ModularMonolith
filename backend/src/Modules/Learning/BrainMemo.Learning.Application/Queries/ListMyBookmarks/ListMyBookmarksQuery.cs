using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Queries.ListMyBookmarks;

public sealed record ListMyBookmarksQuery(
    Guid CurrentUserId) : IQuery<IReadOnlyList<BookmarkDto>>;
