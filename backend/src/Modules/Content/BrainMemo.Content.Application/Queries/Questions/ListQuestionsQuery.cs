using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.DTOs;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.Questions;

public sealed record ListQuestionsQuery(
    Guid CourseId,
    Guid RequesterUserId,
    string? Tag,
    byte? DifficultyCode,
    string? QuestionType,
    string? Status,
    int Page,
    int PageSize) : IQuery<QuestionListResponseDto>;

public sealed class ListQuestionsQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListQuestionsQuery, QuestionListResponseDto>
{
    public async Task<Result<QuestionListResponseDto>> Handle(ListQuestionsQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<QuestionListResponseDto>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<QuestionListResponseDto>(new Error("FORBIDDEN", "Chỉ chủ khóa học mới có quyền xem danh sách câu hỏi."));
        }

        QuestionType? qType = null;
        if (!string.IsNullOrWhiteSpace(request.QuestionType) && Enum.TryParse<QuestionType>(request.QuestionType, true, out var parsedType))
        {
            qType = parsedType;
        }

        QuestionStatus? qStatus = null;
        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<QuestionStatus>(request.Status, true, out var parsedStatus))
        {
            qStatus = parsedStatus;
        }

        var (items, total) = await contentRepository.ListQuestionsAsync(
            request.CourseId,
            request.Tag,
            request.DifficultyCode,
            qType,
            qStatus,
            request.Page,
            request.PageSize,
            cancellationToken);

        var questionIds = items.Select(q => q.Id).ToList();
        var optionsMap = await contentRepository.GetOptionsForQuestionsAsync(questionIds, cancellationToken);
        var tagsMap = await contentRepository.GetTagsForQuestionsAsync(questionIds, cancellationToken);

        var dtos = items.Select(q =>
        {
            optionsMap.TryGetValue(q.Id, out var options);
            options ??= Array.Empty<QuestionOption>();

            tagsMap.TryGetValue(q.Id, out var tags);
            tags ??= Array.Empty<string>();

            var optionDtos = options.OrderBy(o => o.Position).Select(o => new QuestionOptionDto(
                o.Id,
                o.Position,
                o.Content,
                o.MatchContent,
                o.BlankNo,
                o.IsCorrect
            )).ToList();

            return new QuestionResponseDto(
                q.Id,
                q.QuestionType.ToString().ToUpperInvariant(),
                q.AllowMultiple,
                q.Stem,
                q.Explanation,
                q.ReferenceAnswer,
                q.DifficultyCode,
                q.DefaultPoints,
                q.Status.ToString().ToUpperInvariant(),
                q.Origin.ToString().ToUpperInvariant(),
                q.CreatedAt,
                q.UpdatedAt,
                tags,
                optionDtos
            );
        }).ToList();

        int page = request.Page < 1 ? 1 : request.Page;
        int pageSize = request.PageSize < 1 ? 20 : request.PageSize;

        return Result.Success(new QuestionListResponseDto(
            dtos,
            new PageMetaDto(total, page, pageSize)));
    }
}
