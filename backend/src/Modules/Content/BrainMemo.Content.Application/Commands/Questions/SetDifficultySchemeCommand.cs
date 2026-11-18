using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record SetDifficultySchemeCommand(
    Guid CourseId,
    Guid RequesterUserId,
    string? DifficultyScheme) : ICommand;

public sealed class SetDifficultySchemeCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<SetDifficultySchemeCommand>
{
    public async Task<Result> Handle(SetDifficultySchemeCommand request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền cấu hình thang độ khó."));
        }

        DifficultyScheme? scheme = null;
        if (!string.IsNullOrWhiteSpace(request.DifficultyScheme))
        {
            if (!Enum.TryParse<DifficultyScheme>(request.DifficultyScheme, true, out var parsedScheme))
            {
                return Result.Failure(new Error("INVALID_ARGUMENT", $"Thang độ khó '{request.DifficultyScheme}' không hợp lệ."));
            }
            scheme = parsedScheme;
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        if (bank is null)
        {
            bank = new QuestionBank(Guid.NewGuid(), request.CourseId, scheme);
            await contentRepository.AddQuestionBankAsync(bank, cancellationToken);
        }
        else
        {
            bank.SetDifficultyScheme(scheme);
            await contentRepository.UpdateQuestionBankAsync(bank, cancellationToken);
        }

        await contentRepository.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
