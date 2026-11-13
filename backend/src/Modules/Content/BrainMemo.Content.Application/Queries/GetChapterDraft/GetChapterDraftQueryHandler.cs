using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Queries.GetChapterDraft;

public sealed class GetChapterDraftQueryHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract) : IQueryHandler<GetChapterDraftQuery, ChapterDetailDto>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<Result<ChapterDetailDto>> Handle(GetChapterDraftQuery request, CancellationToken cancellationToken)
    {
        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            request.CourseId,
            request.RequesterUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED")
        {
            return Result.Failure<ChapterDetailDto>(new Error("COURSE_DELETED", "Course has been deleted."));
        }

        if (!accessResult.Value.IsOwner)
        {
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can access chapter drafts."));
        }

        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        IReadOnlyList<Block> blocks = await contentRepository.GetBlocksByChapterIdAsync(chapter.Id, cancellationToken);

        var blockDtos = new List<BlockDto>();

        foreach (Block b in blocks.OrderBy(b => b.Position))
        {
            IReadOnlyList<Flashcard>? flashcards = null;
            if (!string.IsNullOrWhiteSpace(b.Flashcards))
            {
                try
                {
                    flashcards = JsonSerializer.Deserialize<List<Flashcard>>(b.Flashcards, JsonOptions);
                }
                catch
                {
                    // Ignore deserialization errors
                }
            }

            QuizConfigDto? quizConfigDto = null;
            if (b.BlockType == Domain.Enums.BlockType.Quiz)
            {
                QuizConfig? qc = await contentRepository.GetQuizConfigAsync(b.Id, cancellationToken);
                if (qc is not null)
                {
                    IReadOnlyList<QuizQuestion> qq = await contentRepository.GetQuizQuestionsAsync(b.Id, cancellationToken);
                    IReadOnlyList<QuizRandomRule> qr = await contentRepository.GetQuizRandomRulesAsync(b.Id, cancellationToken);
                    IReadOnlyList<QuizPrerequisite> qp = await contentRepository.GetQuizPrerequisitesAsync(b.Id, cancellationToken);

                    quizConfigDto = new QuizConfigDto(
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
                        qp.Select(p => new QuizPrerequisiteDto(p.TargetKind.ToString().ToUpperInvariant(), p.TargetId)).ToList());
                }
            }

            AssignmentConfigDto? assignmentConfigDto = null;
            if (b.BlockType == Domain.Enums.BlockType.Assignment)
            {
                AssignmentConfig? ac = await contentRepository.GetAssignmentConfigAsync(b.Id, cancellationToken);
                if (ac is not null)
                {
                    assignmentConfigDto = new AssignmentConfigDto(
                        ac.DueAt,
                        ac.MaxPoints,
                        (int)ac.MaxFileSizeBytes);
                }
            }

            blockDtos.Add(new BlockDto(
                b.Id,
                b.BlockType.ToString().ToUpperInvariant(),
                b.Position,
                b.Title,
                b.Body,
                b.ResourceId,
                b.QuestionId,
                flashcards,
                b.AiReviewStatus.ToString().ToUpperInvariant(),
                quizConfigDto,
                assignmentConfigDto));
        }

        var detail = new ChapterDetailDto(
            chapter.Id,
            chapter.CourseId,
            chapter.Position,
            chapter.Title,
            chapter.Description,
            chapter.Status.ToString().ToUpperInvariant(),
            chapter.LastVersionNo,
            chapter.PublishedVersionNo,
            blockDtos);

        return Result.Success(detail);
    }
}
