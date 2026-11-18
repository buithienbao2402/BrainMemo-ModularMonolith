using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Commands.DeleteComponent;

public sealed class DeleteComponentCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<DeleteComponentCommand>
{
    public async Task<Result> Handle(DeleteComponentCommand request, CancellationToken cancellationToken)
    {
        var comp = await repository.GetComponentByCourseAndBlockIdAsync(request.CourseId, request.BlockId, cancellationToken).ConfigureAwait(false);
        if (comp == null)
        {
            return Result.Success();
        }

        bool hasRecords = await repository.HasGradeRecordsForComponentAsync(comp.Id, cancellationToken).ConfigureAwait(false);
        if (hasRecords)
        {
            return Result.Failure(Error.Conflict("COMP_HAS_RECORDS", "Không thể gỡ thành phần đánh giá đã có bản ghi chấm điểm."));
        }

        await repository.DeleteComponentAsync(comp, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
