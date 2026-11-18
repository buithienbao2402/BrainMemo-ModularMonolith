using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Outcomes.Commands.CreatePlo;

public sealed record CreatePloCommand(
    Guid CourseId,
    string Code,
    string Description) : ICommand<PloDto>;

public sealed class CreatePloCommandHandler(IAssessmentRepository repository)
    : ICommandHandler<CreatePloCommand, PloDto>
{
    public async Task<Result<PloDto>> Handle(CreatePloCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return Result.Failure<PloDto>(Error.Validation("Mã PLO không được để trống."));
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return Result.Failure<PloDto>(Error.Validation("Mô tả PLO không được để trống."));
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        // Check UK(course_id, code)
        var existing = await repository.GetPloByCourseAndCodeAsync(request.CourseId, normalizedCode, cancellationToken).ConfigureAwait(false);
        if (existing != null)
        {
            return Result.Failure<PloDto>(Error.Conflict("PLO_CODE_EXISTS", $"PLO với mã '{normalizedCode}' đã tồn tại trong khóa học."));
        }

        var plo = new Plo(
            id: Guid.NewGuid(),
            courseId: request.CourseId,
            code: normalizedCode,
            description: request.Description.Trim());

        await repository.AddPloAsync(plo, cancellationToken).ConfigureAwait(false);
        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(new PloDto(
            Id: plo.Id,
            Code: plo.Code,
            Description: plo.Description));
    }
}
