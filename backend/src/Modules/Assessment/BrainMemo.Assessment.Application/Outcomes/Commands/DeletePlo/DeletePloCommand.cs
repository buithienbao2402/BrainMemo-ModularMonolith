using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.DeletePlo;

public sealed record DeletePloCommand(Guid CourseId, Guid Id) : ICommand;

public sealed class DeletePloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<DeletePloCommand>
{
    public async Task<Result> Handle(DeletePloCommand request, CancellationToken cancellationToken)
    {
        var plo = await repository.GetPloByIdAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (plo == null || plo.CourseId != request.CourseId)
        {
            return Result.Failure(Error.NotFound("Không tìm thấy chuẩn đầu ra PLO."));
        }

        // Also clean up any references in CLOs
        var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        foreach (var clo in clos)
        {
            if (clo.LinkedPloIds.Contains(request.Id))
            {
                var updatedList = clo.LinkedPloIds.Where(id => id != request.Id).ToList();
                clo.Update(clo.Code, clo.Description, clo.BloomLevelCode, updatedList);
            }
        }

        await repository.DeletePloAsync(plo, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
