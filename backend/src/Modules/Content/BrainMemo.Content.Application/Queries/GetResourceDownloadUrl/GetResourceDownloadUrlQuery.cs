using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Content.Application.Queries.GetResourceDownloadUrl;

public sealed record ResourceDownloadUrlDto(string Url, DateTimeOffset ExpiresAt);

public sealed record GetResourceDownloadUrlQuery(
    Guid CourseId,
    Guid ResourceId,
    Guid? RequesterUserId) : IQuery<ResourceDownloadUrlDto>;
