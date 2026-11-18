using BrainMemo.BuildingBlocks.Abstractions.Cqrs;

namespace BrainMemo.Course.Application.Queries.GetNominationSummary;

public sealed record NominationSummaryDto(int NominationCount, bool HasNominated);

public sealed record GetNominationSummaryQuery(Guid CourseId, Guid? CurrentUserId) : IQuery<NominationSummaryDto>;
