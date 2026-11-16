using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Content.Domain.Services;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record UpdateQuestionCommand(
    Guid CourseId,
    Guid QuestionId,
    Guid RequesterUserId,
    QuestionUpsertDto Request) : ICommand<QuestionResponseDto>;

public sealed class UpdateQuestionCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<UpdateQuestionCommand, QuestionResponseDto>
{
    public async Task<Result<QuestionResponseDto>> Handle(UpdateQuestionCommand request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<QuestionResponseDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<QuestionResponseDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền sửa câu hỏi."));
        }

        var question = await contentRepository.GetQuestionByIdAsync(request.QuestionId, cancellationToken);
        if (question is null)
        {
            return Result.Failure<QuestionResponseDto>(new Error("QUESTION_NOT_FOUND", "Câu hỏi không tồn tại."));
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        if (bank is null || question.BankId != bank.Id)
        {
            return Result.Failure<QuestionResponseDto>(new Error("QUESTION_NOT_FOUND", "Câu hỏi không thuộc khóa học này."));
        }

        if (!Enum.TryParse<QuestionType>(request.Request.QuestionType, true, out var qType))
        {
            return Result.Failure<QuestionResponseDto>(new Error("INVALID_ARGUMENT", $"Loại câu hỏi '{request.Request.QuestionType}' không hợp lệ."));
        }

        var options = (request.Request.Options ?? Array.Empty<QuestionOptionUpsertDto>())
            .Select(o => new QuestionOption(
                o.Id ?? Guid.NewGuid(),
                question.Id,
                o.Position,
                o.Content ?? string.Empty,
                o.MatchContent,
                o.BlankNo,
                o.IsCorrect))
            .ToList();

        // If question is currently READY, validate that changes keep it in a valid state
        if (question.Status == QuestionStatus.Ready)
        {
            var validationResult = QuestionValidator.ValidateForReady(
                qType,
                request.Request.AllowMultiple,
                request.Request.Stem,
                request.Request.Explanation,
                request.Request.ReferenceAnswer,
                options);

            if (validationResult.IsFailure)
            {
                return Result.Failure<QuestionResponseDto>(validationResult.Error);
            }
        }

        question.Update(
            qType,
            request.Request.Stem ?? string.Empty,
            request.Request.Explanation,
            request.Request.ReferenceAnswer,
            request.Request.DifficultyCode,
            request.Request.DefaultPoints,
            request.Request.AllowMultiple);

        var tags = request.Request.Tags ?? Array.Empty<string>();

        await contentRepository.UpdateQuestionWithOptionsAndTagsAsync(question, options, tags, cancellationToken);
        await contentRepository.SaveChangesAsync(cancellationToken);

        var optionDtos = options.OrderBy(o => o.Position).Select(o => new QuestionOptionDto(
            o.Id,
            o.Position,
            o.Content,
            o.MatchContent,
            o.BlankNo,
            o.IsCorrect
        )).ToList();

        var dto = new QuestionResponseDto(
            question.Id,
            question.QuestionType.ToString().ToUpperInvariant(),
            question.AllowMultiple,
            question.Stem,
            question.Explanation,
            question.ReferenceAnswer,
            question.DifficultyCode,
            question.DefaultPoints,
            question.Status.ToString().ToUpperInvariant(),
            question.Origin.ToString().ToUpperInvariant(),
            question.CreatedAt,
            question.UpdatedAt,
            tags,
            optionDtos
        );

        return Result.Success(dto);
    }
}
