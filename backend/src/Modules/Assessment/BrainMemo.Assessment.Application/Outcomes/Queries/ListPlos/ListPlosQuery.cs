using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Queries.ListPlos;

public sealed record ListPlosQuery(Guid CourseId) : IQuery<IReadOnlyList<PloDto>>;

public sealed class ListPlosQueryHandler(IAssessmentRepository repository)
    : IQueryHandler<ListPlosQuery, IReadOnlyList<PloDto>>
{
    public async Task<Result<IReadOnlyList<PloDto>>> Handle(ListPlosQuery request, CancellationToken cancellationToken)
    {
        var plos = await repository.GetPlosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var dtos = plos.Select(p => new PloDto(
            Id: p.Id,
            Code: p.Code,
            Description: p.Description)).ToList();

        return Result.Success<IReadOnlyList<PloDto>>(dtos);
    }
}
