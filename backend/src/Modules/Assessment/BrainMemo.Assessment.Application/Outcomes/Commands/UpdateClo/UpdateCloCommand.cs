using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.UpdateClo;

public sealed record UpdateCloCommand(
    Guid CourseId,
    Guid Id,
    string Code,
    string Description,
    string? BloomLevelCode = null,
    IReadOnlyList<Guid>? LinkedPloIds = null) : ICommand<CloDto>;

public sealed class UpdateCloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<UpdateCloCommand, CloDto>
{
    public async Task<Result<CloDto>> Handle(UpdateCloCommand request, CancellationToken cancellationToken)
    {
        var clo = await repository.GetCloByIdAsync(request.Id, cancellationToken).ConfigureAwait(false);
        if (clo == null || clo.CourseId != request.CourseId)
        {
            return Result.Failure<CloDto>(Error.NotFound("Không tìm thấy chuẩn đầu ra CLO."));
        }

        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result.Failure<CloDto>(Error.Validation("Mã CLO không được để trống."));
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        // If code changed, check UK
        if (!string.Equals(clo.Code, normalizedCode, StringComparison.OrdinalIgnoreCase))
        {
            var existing = await repository.GetCloByCourseAndCodeAsync(request.CourseId, normalizedCode, cancellationToken).ConfigureAwait(false);
            if (existing != null && existing.Id != clo.Id)
            {
                return Result.Failure<CloDto>(Error.Conflict("CLO_CODE_EXISTS", $"CLO với mã '{normalizedCode}' đã tồn tại trong khóa học."));
            }
        }

        clo.Update(
            code: normalizedCode,
            description: request.Description.Trim(),
            bloomLevelCode: request.BloomLevelCode?.Trim(),
            linkedPloIds: request.LinkedPloIds?.ToList());

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new CloDto(
            Id: clo.Id,
            Code: clo.Code,
            Description: clo.Description,
            BloomLevelCode: clo.BloomLevelCode,
            LinkedPloIds: clo.LinkedPloIds));
    }
}
