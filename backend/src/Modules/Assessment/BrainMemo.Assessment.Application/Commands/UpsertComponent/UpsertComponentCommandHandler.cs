using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Commands.UpsertComponent;

public sealed class UpsertComponentCommandHandler(
    IAssessmentRepository repository,
    IContentContract contentContract)
    : ICommandHandler<UpsertComponentCommand, ComponentDto>
{
    public async Task<Result<ComponentDto>> Handle(UpsertComponentCommand request, CancellationToken cancellationToken)
    {
        if (request.CourseWeight < 0)
        {
            return Result.Failure<ComponentDto>(Error.Validation("Trọng số thành phần phải lớn hơn hoặc bằng 0."));
        }

        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var block = assessableBlocksRes.IsSuccess
            ? assessableBlocksRes.Value.FirstOrDefault(b => b.BlockId == request.BlockId)
            : null;

        if (block == null)
        {
            return Result.Failure<ComponentDto>(Error.NotFound("Khối học này không tồn tại hoặc không phải là thành phần đánh giá."));
        }

        decimal maxScore = block.MaxScore ?? 10m;
        string sourceKind = block.BlockType.ToUpperInvariant();

        var comp = await repository.GetComponentByCourseAndBlockIdAsync(request.CourseId, request.BlockId, cancellationToken).ConfigureAwait(false);
        if (comp == null)
        {
            comp = new AssessmentComponent(
                Guid.NewGuid(),
                request.CourseId,
                sourceKind,
                request.BlockId,
                block.Title,
                maxScore,
                request.CourseWeight);

            await repository.GetOrCreateDefaultComponentAsync(
                request.CourseId,
                sourceKind,
                request.BlockId,
                block.Title,
                maxScore,
                request.CourseWeight,
                cancellationToken).ConfigureAwait(false);
        }
        else
        {
            comp.Update(block.Title, maxScore, request.CourseWeight);
        }

        if (request.CloWeights != null)
        {
            var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
            var validCloIds = clos.Select(c => c.Id).ToHashSet();

            var newWeights = new List<ComponentOutcomeWeight>();
            foreach (var item in request.CloWeights)
            {
                if (item.Weight <= 0)
                {
                    return Result.Failure<ComponentDto>(Error.Validation("Trọng số CLO phải lớn hơn 0."));
                }

                if (!validCloIds.Contains(item.CloId))
                {
                    return Result.Failure<ComponentDto>(Error.Validation($"CLO '{item.CloId}' không thuộc khóa học này."));
                }

                newWeights.Add(new ComponentOutcomeWeight(
                    id: Guid.NewGuid(),
                    componentId: comp.Id,
                    cloId: item.CloId,
                    weight: item.Weight));
            }

            await repository.ReplaceComponentOutcomeWeightsAsync(comp.Id, newWeights, cancellationToken).ConfigureAwait(false);
        }

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new ComponentDto(
            BlockId: comp.SourceBlockId,
            SourceKind: comp.SourceKind,
            Title: comp.Title,
            MaxScore: comp.MaxScore,
            CourseWeight: comp.CourseWeight,
            IsComponent: true,
            CloWeights: request.CloWeights));
    }
}
