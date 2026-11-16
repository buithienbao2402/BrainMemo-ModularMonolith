using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Content.Domain.Services;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record SetQuestionStatusCommand(
    Guid CourseId,
    Guid QuestionId,
    Guid RequesterUserId,
    string Status) : ICommand;

public sealed class SetQuestionStatusCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<SetQuestionStatusCommand>
{
    public async Task<Result> Handle(SetQuestionStatusCommand request, CancellationToken cancellationToken)
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
            return Result.Failure(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền thay đổi trạng thái câu hỏi."));
        }

        if (!Enum.TryParse<QuestionStatus>(request.Status, true, out var newStatus))
        {
            return Result.Failure(new Error("INVALID_ARGUMENT", $"Trạng thái '{request.Status}' không hợp lệ."));
        }

        var question = await contentRepository.GetQuestionByIdAsync(request.QuestionId, cancellationToken);
        if (question is null)
        {
            return Result.Failure(new Error("QUESTION_NOT_FOUND", "Câu hỏi không tồn tại."));
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        if (bank is null || question.BankId != bank.Id)
        {
            return Result.Failure(new Error("QUESTION_NOT_FOUND", "Câu hỏi không thuộc khóa học này."));
        }

        if (newStatus == QuestionStatus.Ready)
        {
            var options = await contentRepository.GetQuestionOptionsAsync(question.Id, cancellationToken);
            var validation = QuestionValidator.ValidateForReady(
                question.QuestionType,
                question.AllowMultiple,
                question.Stem,
                question.Explanation,
                question.ReferenceAnswer,
                options);

            if (validation.IsFailure)
            {
                return validation;
            }
        }

        question.SetStatus(newStatus);
        await contentRepository.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
