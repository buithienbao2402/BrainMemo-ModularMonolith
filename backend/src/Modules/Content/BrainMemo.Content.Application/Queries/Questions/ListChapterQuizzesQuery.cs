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

public sealed record ListChapterQuizzesQuery(
    Guid CourseId,
    Guid ChapterId,
    Guid? RequesterUserId) : IQuery<IReadOnlyList<ChapterQuizSummaryDto>>;

public sealed class ListChapterQuizzesQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<ListChapterQuizzesQuery, IReadOnlyList<ChapterQuizSummaryDto>>
{
    public async Task<Result<IReadOnlyList<ChapterQuizSummaryDto>>> Handle(ListChapterQuizzesQuery request, CancellationToken cancellationToken)
    {
        var chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId)
        {
            return Result.Failure<IReadOnlyList<ChapterQuizSummaryDto>>(new Error("CHAPTER_NOT_FOUND", "Chương học không tồn tại."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<ChapterQuizSummaryDto>>(new Error("COURSE_NOT_FOUND", "Khóa học không tồn tại."));
        }

        // Get blocks (draft or published)
        var blocks = await contentRepository.GetBlocksByChapterIdAsync(request.ChapterId, cancellationToken);
        var quizBlocks = blocks.Where(b => b.BlockType == BlockType.Quiz).ToList();

        // If no draft blocks, check published blocks
        var publishedBlocks = await contentRepository.GetPublishedBlocksByChapterIdAsync(request.ChapterId, cancellationToken);
        var publishedQuizBlocks = publishedBlocks.Where(b => b.BlockType == BlockType.Quiz).ToList();

        var result = new List<ChapterQuizSummaryDto>();
        var seenBlockIds = new HashSet<Guid>();

        foreach (var b in quizBlocks)
        {
            seenBlockIds.Add(b.Id);
            var qc = await contentRepository.GetQuizConfigAsync(b.Id, cancellationToken);
            var qq = await contentRepository.GetQuizQuestionsAsync(b.Id, cancellationToken);
            var qr = await contentRepository.GetQuizRandomRulesAsync(b.Id, cancellationToken);
            var qp = await contentRepository.GetQuizPrerequisitesAsync(b.Id, cancellationToken);

            QuizConfigDto? qcDto = null;
            if (qc is not null)
            {
                qcDto = new QuizConfigDto(
                    qc.OpenAt,
                    qc.CloseAt,
                    qc.TimeLimitMinutes,
                    qc.MaxAttempts,
                    qc.PassScore,
                    qc.ResultDisplay.ToString().ToUpperInvariant(),
                    qc.ShuffleQuestions,
                    qc.ShuffleOptions,
                    null,
                    !string.IsNullOrEmpty(qc.PasswordHash),
                    qq.Select(q => new QuizQuestionItemDto(q.QuestionId, q.Position, q.Points)).ToList(),
                    qr.Select(r => new QuizRandomRuleDto(
                        r.Position,
                        r.PickCount,
                        r.PointsEach,
                        r.FilterTag,
                        r.FilterDifficultyCode,
                        r.FilterQuestionType?.ToString().ToUpperInvariant())).ToList(),
                    qp.Select(p => new QuizPrerequisiteDto(p.TargetKind.ToString().ToUpperInvariant(), p.TargetId)).ToList()
                );
            }

            int questionCount = qq.Count + qr.Sum(r => (int)r.PickCount);
            result.Add(new ChapterQuizSummaryDto(b.Id, b.Title ?? "Quiz", qcDto, questionCount));
        }

        foreach (var pb in publishedQuizBlocks)
        {
            if (seenBlockIds.Contains(pb.BlockId)) continue;
            seenBlockIds.Add(pb.BlockId);

            var qc = await contentRepository.GetQuizConfigAsync(pb.BlockId, cancellationToken);
            var qq = await contentRepository.GetQuizQuestionsAsync(pb.BlockId, cancellationToken);
            var qr = await contentRepository.GetQuizRandomRulesAsync(pb.BlockId, cancellationToken);
            var qp = await contentRepository.GetQuizPrerequisitesAsync(pb.BlockId, cancellationToken);

            QuizConfigDto? qcDto = null;
            if (qc is not null)
            {
                qcDto = new QuizConfigDto(
                    qc.OpenAt,
                    qc.CloseAt,
                    qc.TimeLimitMinutes,
                    qc.MaxAttempts,
                    qc.PassScore,
                    qc.ResultDisplay.ToString().ToUpperInvariant(),
                    qc.ShuffleQuestions,
                    qc.ShuffleOptions,
                    null,
                    !string.IsNullOrEmpty(qc.PasswordHash),
                    qq.Select(q => new QuizQuestionItemDto(q.QuestionId, q.Position, q.Points)).ToList(),
                    qr.Select(r => new QuizRandomRuleDto(
                        r.Position,
                        r.PickCount,
                        r.PointsEach,
                        r.FilterTag,
                        r.FilterDifficultyCode,
                        r.FilterQuestionType?.ToString().ToUpperInvariant())).ToList(),
                    qp.Select(p => new QuizPrerequisiteDto(p.TargetKind.ToString().ToUpperInvariant(), p.TargetId)).ToList()
                );
            }

            int questionCount = qq.Count + qr.Sum(r => (int)r.PickCount);
            result.Add(new ChapterQuizSummaryDto(pb.BlockId, chapter.Title, qcDto, questionCount));
        }

        return Result.Success<IReadOnlyList<ChapterQuizSummaryDto>>(result);
    }
}
