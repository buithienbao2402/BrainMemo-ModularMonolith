using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record GetQuestionBankQuery(
    Guid CourseId,
    Guid RequesterUserId) : IQuery<QuestionBankDto>;

public sealed class GetQuestionBankQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<GetQuestionBankQuery, QuestionBankDto>
{
    public async Task<Result<QuestionBankDto>> Handle(GetQuestionBankQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<QuestionBankDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<QuestionBankDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền truy cập ngân hàng câu hỏi."));
        }

        var bank = await contentRepository.GetQuestionBankByCourseIdAsync(request.CourseId, cancellationToken);
        return Result.Success(new QuestionBankDto(bank?.DifficultyScheme?.ToString()));
    }
}
