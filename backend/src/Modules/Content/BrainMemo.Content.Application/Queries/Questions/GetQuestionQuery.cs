using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record GetQuestionQuery(
    Guid CourseId,
    Guid QuestionId,
    Guid RequesterUserId) : IQuery<QuestionResponseDto>;

public sealed class GetQuestionQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<GetQuestionQuery, QuestionResponseDto>
{
    public async Task<Result<QuestionResponseDto>> Handle(GetQuestionQuery request, CancellationToken cancellationToken)
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
            return Result.Failure<QuestionResponseDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xem chi tiết câu hỏi."));
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

        var options = await contentRepository.GetQuestionOptionsAsync(question.Id, cancellationToken);
        var tags = await contentRepository.GetQuestionTagsAsync(question.Id, cancellationToken);

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
