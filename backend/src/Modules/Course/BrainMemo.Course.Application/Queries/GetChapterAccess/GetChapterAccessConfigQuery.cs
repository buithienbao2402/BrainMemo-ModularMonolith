using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Course.Contracts.Dtos;

namespace BrainMemo.Course.Application.Queries.GetChapterAccess;

public sealed record GetChapterAccessConfigQuery(Guid CourseId, Guid ChapterId) : IQuery<ChapterAccessConfigDto>;
