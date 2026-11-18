using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Queries.ListClos;

public sealed record ListClosQuery(Guid CourseId) : IQuery<IReadOnlyList<CloDto>>;

public sealed class ListClosQueryHandler(IAssessmentRepository repository)
    : IQueryHandler<ListClosQuery, IReadOnlyList<CloDto>>
{
    public async Task<Result<IReadOnlyList<CloDto>>> Handle(ListClosQuery request, CancellationToken cancellationToken)
    {
        var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var dtos = clos.Select(c => new CloDto(
            Id: c.Id,
            Code: c.Code,
            Description: c.Description,
            BloomLevelCode: c.BloomLevelCode,
            LinkedPloIds: c.LinkedPloIds)).ToList();

        return Result.Success<IReadOnlyList<CloDto>>(dtos);
    }
}
