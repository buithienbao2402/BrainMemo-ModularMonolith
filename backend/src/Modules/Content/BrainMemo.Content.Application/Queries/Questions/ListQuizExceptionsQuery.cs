using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record ListQuizExceptionsQuery(
    Guid CourseId,
    Guid QuizBlockId,
    Guid RequesterUserId) : IQuery<IReadOnlyList<QuizExceptionDto>>;

public sealed class ListQuizExceptionsQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListQuizExceptionsQuery, IReadOnlyList<QuizExceptionDto>>
{
    public async Task<Result<IReadOnlyList<QuizExceptionDto>>> Handle(ListQuizExceptionsQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<QuizExceptionDto>>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<IReadOnlyList<QuizExceptionDto>>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xem danh sách ngoại lệ."));
        }

        var exceptions = await contentRepository.ListQuizExceptionsAsync(request.QuizBlockId, cancellationToken);
        var dtos = exceptions.Select(e => new QuizExceptionDto(
            e.UserId,
            e.ExtraMinutes,
            e.ExtraAttempts,
            e.ExtendedCloseAt)).ToList();

        return Result.Success<IReadOnlyList<QuizExceptionDto>>(dtos);
    }
}
