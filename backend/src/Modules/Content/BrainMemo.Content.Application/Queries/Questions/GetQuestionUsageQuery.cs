using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record GetQuestionUsageQuery(
    Guid CourseId,
    Guid QuestionId,
    Guid RequesterUserId) : IQuery<QuestionUsageDto>;

public sealed class GetQuestionUsageQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<GetQuestionUsageQuery, QuestionUsageDto>
{
    public async Task<Result<QuestionUsageDto>> Handle(GetQuestionUsageQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<QuestionUsageDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<QuestionUsageDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xem thống kê sử dụng câu hỏi."));
        }

        var question = await contentRepository.GetQuestionByIdAsync(request.QuestionId, cancellationToken);
        if (question is null)
        {
            return Result.Failure<QuestionUsageDto>(new Error("QUESTION_NOT_FOUND", "Câu hỏi không tồn tại."));
        }

        var quizzes = await contentRepository.GetQuestionUsageQuizzesAsync(request.QuestionId, cancellationToken);
        var quizDtos = quizzes.Select(q => new QuestionUsageQuizDto(q.BlockId, q.Title)).ToList();

        return Result.Success(new QuestionUsageDto(
            quizDtos,
            AttemptCount: 0,
            CorrectRate: null));
    }
}
