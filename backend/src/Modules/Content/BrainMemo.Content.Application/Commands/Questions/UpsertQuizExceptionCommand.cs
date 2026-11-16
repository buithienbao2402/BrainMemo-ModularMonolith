using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.Questions;

public sealed record UpsertQuizExceptionCommand(
    Guid CourseId,
    Guid QuizBlockId,
    Guid UserId,
    Guid RequesterUserId,
    QuizExceptionUpsertDto Request) : ICommand;

public sealed class UpsertQuizExceptionCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : ICommandHandler<UpsertQuizExceptionCommand>
{
    public async Task<Result> Handle(UpsertQuizExceptionCommand request, CancellationToken cancellationToken)
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
            return Result.Failure(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền đặt ngoại lệ."));
        }

        // At least one field must be specified
        if (!request.Request.ExtraMinutes.HasValue &&
            !request.Request.ExtraAttempts.HasValue &&
            !request.Request.ExtendedCloseAt.HasValue)
        {
            return Result.Failure(new Error("INVALID_ARGUMENT", "Phải cung cấp ít nhất một trường ngoại lệ (extraMinutes, extraAttempts, extendedCloseAt)."));
        }

        // Quiz must be published or exist
        var publishedBlock = await contentRepository.GetPublishedBlockByIdAsync(request.QuizBlockId, cancellationToken);
        var quizConfig = await contentRepository.GetQuizConfigAsync(request.QuizBlockId, cancellationToken);
        if (publishedBlock is null && quizConfig is null)
        {
            return Result.Failure(new Error("QUIZ_NOT_FOUND", "Bài kiểm tra không tồn tại hoặc chưa được đăng tải."));
        }

        var exception = await contentRepository.GetQuizExceptionAsync(request.QuizBlockId, request.UserId, cancellationToken);
        if (exception is null)
        {
            exception = new QuizException(
                Guid.NewGuid(),
                request.CourseId,
                request.QuizBlockId,
                request.UserId,
                request.Request.ExtraMinutes,
                request.Request.ExtraAttempts,
                request.Request.ExtendedCloseAt);

            await contentRepository.AddQuizExceptionAsync(exception, cancellationToken);
        }
        else
        {
            exception.Update(
                request.Request.ExtraMinutes,
                request.Request.ExtraAttempts,
                request.Request.ExtendedCloseAt);

            await contentRepository.UpdateQuizExceptionAsync(exception, cancellationToken);
        }

        await contentRepository.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
