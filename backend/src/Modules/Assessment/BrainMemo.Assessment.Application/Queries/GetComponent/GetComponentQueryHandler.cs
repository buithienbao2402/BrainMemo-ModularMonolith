using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetComponent;

public sealed class GetComponentQueryHandler(
    IAssessmentRepository repository,
    IContentContract contentContract)
    : IQueryHandler<GetComponentQuery, ComponentDto>
{
    public async Task<Result<ComponentDto>> Handle(GetComponentQuery request, CancellationToken cancellationToken)
    {
        var comp = await repository.GetComponentByCourseAndBlockIdAsync(request.CourseId, request.BlockId, cancellationToken).ConfigureAwait(false);
        if (comp != null)
        {
            return Result.Success(new ComponentDto(
                BlockId: comp.SourceBlockId,
                SourceKind: comp.SourceKind,
                Title: comp.Title,
                MaxScore: comp.MaxScore,
                CourseWeight: comp.CourseWeight,
                IsComponent: true));
        }

        // Check if block exists in Content
        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var block = assessableBlocksRes.IsSuccess
            ? assessableBlocksRes.Value.FirstOrDefault(b => b.BlockId == request.BlockId)
            : null;

        if (block == null)
        {
            return Result.Failure<ComponentDto>(Error.NotFound("Không tìm thấy thành phần đánh giá."));
        }

        return Result.Success(new ComponentDto(
            BlockId: block.BlockId,
            SourceKind: block.BlockType.ToUpperInvariant(),
            Title: block.Title,
            MaxScore: block.MaxScore ?? 10m,
            CourseWeight: null,
            IsComponent: false));
    }
}
