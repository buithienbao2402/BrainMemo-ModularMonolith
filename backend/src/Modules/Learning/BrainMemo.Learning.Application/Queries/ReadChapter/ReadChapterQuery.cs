using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Learning.Application.Queries.ReadChapter;

public sealed record ReadChapterQuery(
    Guid CourseId,
    Guid ChapterId,
    Guid? CurrentUserId) : IQuery<LearnChapterDto>;
