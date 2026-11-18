using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.UpdatePlo;

public sealed record UpdatePloCommand(
    Guid CourseId,
    Guid Id,
    string Code,
    string Description) : ICommand<PloDto>;

public sealed class UpdatePloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<UpdatePloCommand, PloDto>
{
    public async Task<Result<PloDto>> Handle(UpdatePloCommand request, CancellationToken cancellationToken)
    {
        var plo = await repository.GetPloByIdAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (plo == null || plo.CourseId != request.CourseId)
        {
            return Result.Failure<PloDto>(Error.NotFound("Không tìm thấy chuẩn đầu ra PLO."));
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result.Failure<PloDto>(Error.Validation("Mã PLO không được để trống."));
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        if (!string.Equals(plo.Code, normalizedCode, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await repository.GetPloByCourseAndCodeAsync(request.CourseId, normalizedCode, cancellationToken).ConfigureAwait(false);
            if (existing != null && existing.Id != plo.Id)
            {
                return Result.Failure<PloDto>(Error.Conflict("PLO_CODE_EXISTS", $"PLO với mã '{normalizedCode}' đã tồn tại trong khóa học."));
            }
        }

        plo.Update(
            code: normalizedCode,
            description: request.Description.Trim());

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new PloDto(
            Id: plo.Id,
            Code: plo.Code,
            Description: plo.Description));
    }
}
