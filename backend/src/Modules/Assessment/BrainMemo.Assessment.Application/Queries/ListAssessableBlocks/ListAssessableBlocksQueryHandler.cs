using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.ListAssessableBlocks;

public sealed class ListAssessableBlocksQueryHandler(
    IContentContract contentContract,
    IAssessmentRepository repository)
    : IQueryHandler<ListAssessableBlocksQuery, IReadOnlyList<ComponentDto>>
{
    public async Task<Result<IReadOnlyList<ComponentDto>>> Handle(ListAssessableBlocksQuery request, CancellationToken cancellationToken)
    {
        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var blocks = assessableBlocksRes.IsSuccess ? assessableBlocksRes.Value : Array.Empty<BrainMemo.Content.Contracts.Dtos.AssessableBlockDto>();

        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var compDict = components.ToDictionary(c => c.SourceBlockId);

        var result = new List<ComponentDto>();

        foreach (var b in blocks)
        {
            if (compDict.TryGetValue(b.BlockId, out var comp))
            {
                result.Add(new ComponentDto(
                    BlockId: b.BlockId,
                    SourceKind: comp.SourceKind,
                    Title: comp.Title,
                    MaxScore: comp.MaxScore,
                    CourseWeight: comp.CourseWeight,
                    IsComponent: true));
            }
            else
            {
                result.Add(new ComponentDto(
                    BlockId: b.BlockId,
                    SourceKind: b.BlockType.ToUpperInvariant(),
                    Title: b.Title,
                    MaxScore: b.MaxScore ?? 10m,
                    CourseWeight: null,
                    IsComponent: false));
            }
        }

        return Result.Success<IReadOnlyList<ComponentDto>>(result);
    }
}
