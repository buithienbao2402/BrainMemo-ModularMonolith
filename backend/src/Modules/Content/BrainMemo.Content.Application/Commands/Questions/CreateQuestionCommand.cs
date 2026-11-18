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

public sealed record CreateQuestionCommand(
    Guid CourseId,
    Guid RequesterUserId,
    QuestionUpsertDto Request) : ICommand<QuestionResponseDto>;

public sealed class CreateQuestionCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<CreateQuestionCommand, QuestionResponseDto>
{
    public async Task<Result<QuestionResponseDto>> Handle(CreateQuestionCommand request, CancellationToken cancellationToken)
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
            return Result.Failure<QuestionResponseDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền tạo câu hỏi."));
        }

        if (!Enum.TryParse<QuestionType>(request.Request.QuestionType, true, out var qType))
        {
            return Result.Failure<QuestionResponseDto>(new Error("INVALID_ARGUMENT", $"Loại câu hỏi '{request.Request.QuestionType}' không hợp lệ."));
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        if (bank is null)
        {
            bank = new QuestionBank(Guid.NewGuid(), request.CourseId);
            await contentRepository.AddQuestionBankAsync(bank, cancellationToken);
            await contentRepository.SaveChangesAsync(cancellationToken);
        }

        Guid questionId = Guid.NewGuid();
        var options = (request.Request.Options ?? Array.Empty<QuestionOptionUpsertDto>())
            .Select(o => new QuestionOption(
                o.Id ?? Guid.NewGuid(),
                questionId,
                o.Position,
                o.Content ?? string.Empty,
                o.MatchContent,
                o.BlankNo,
                o.IsCorrect))
            .ToList();

        var question = new Question(
            questionId,
            bank.Id,
            qType,
            request.Request.AllowMultiple,
            request.Request.Stem ?? string.Empty,
            request.Request.Explanation,
            request.Request.ReferenceAnswer,
            request.Request.DifficultyCode,
            request.Request.DefaultPoints,
            QuestionStatus.Draft,
            QuestionOrigin.Manual);

        var tags = request.Request.Tags ?? Array.Empty<string>();

        await contentRepository.AddQuestionWithOptionsAndTagsAsync(question, options, tags, cancellationToken);
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
