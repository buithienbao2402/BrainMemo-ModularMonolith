using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.CreateClo;

public sealed record CreateCloCommand(
    Guid CourseId,
    string Code,
    string Description,
    string? BloomLevelCode = null,
    IReadOnlyList<Guid>? LinkedPloIds = null) : ICommand<CloDto>;

public sealed class CreateCloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<CreateCloCommand, CloDto>
{
    public async Task<Result<CloDto>> Handle(CreateCloCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result.Failure<CloDto>(Error.Validation("Mã CLO không được để trống."));
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return Result.Failure<CloDto>(Error.Validation("Mô tả CLO không được để trống."));
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        // Check UK(course_id, code)
        var existing = await repository.GetCloByCourseAndCodeAsync(request.CourseId, normalizedCode, cancellationToken).ConfigureAwait(false);
        if (existing != null)
        {
            return Result.Failure<CloDto>(Error.Conflict("CLO_CODE_EXISTS", $"CLO với mã '{normalizedCode}' đã tồn tại trong khóa học."));
        }

        var clo = new Clo(
            id: Guid.NewGuid(),
            courseId: request.CourseId,
            code: normalizedCode,
            description: request.Description.Trim(),
            bloomLevelCode: request.BloomLevelCode?.Trim(),
            linkedPloIds: request.LinkedPloIds?.ToList());

        await repository.AddCloAsync(clo, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new CloDto(
            Id: clo.Id,
            Code: clo.Code,
            Description: clo.Description,
            BloomLevelCode: clo.BloomLevelCode,
            LinkedPloIds: clo.LinkedPloIds));
    }
}
