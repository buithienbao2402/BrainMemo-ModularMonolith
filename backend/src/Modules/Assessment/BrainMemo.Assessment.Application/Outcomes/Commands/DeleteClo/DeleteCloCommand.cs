using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.DeleteClo;

public sealed record DeleteCloCommand(Guid CourseId, Guid Id) : ICommand;

public sealed class DeleteCloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<DeleteCloCommand>
{
    public async Task<Result> Handle(DeleteCloCommand request, CancellationToken cancellationToken)
    {
        var clo = await repository.GetCloByIdAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (clo == null || clo.CourseId != request.CourseId)
        {
            return Result.Failure(Error.NotFound("Không tìm thấy chuẩn đầu ra CLO."));
        }

        // Check if referenced in outcome weights (409 conflict per openapi spec)
        bool inUse = await repository.HasOutcomeWeightsForCloAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (inUse)
        {
            return Result.Failure(Error.Conflict("CLO_IN_USE", "Không thể xóa CLO vì đã được gắn trọng số vào thành phần đánh giá."));
        }

        await repository.DeleteCloAsync(clo, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
