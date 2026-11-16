using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record DeleteQuizExceptionCommand(
    Guid CourseId,
    Guid QuizBlockId,
    Guid UserId,
    Guid RequesterUserId) : ICommand;

public sealed class DeleteQuizExceptionCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<DeleteQuizExceptionCommand>
{
    public async Task<Result> Handle(DeleteQuizExceptionCommand request, CancellationToken cancellationToken)
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
            return Result.Failure(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xóa ngoại lệ."));
        }

        var exception = await contentRepository.GetQuizExceptionAsync(request.QuizBlockId, request.UserId, cancellationToken);
        if (exception is not null)
        {
            await contentRepository.DeleteQuizExceptionAsync(exception, cancellationToken);
            await contentRepository.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }
}
