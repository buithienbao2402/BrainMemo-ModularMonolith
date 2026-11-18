using System.Text.Json;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;

namespace BrainMemo.Content.Application.Common;

public static class ChapterDetailMapper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static string FormatBlockType(BlockType type) => type switch
    {
        BlockType.RichText => "RICH_TEXT",
        BlockType.Image => "IMAGE",
        BlockType.Video => "VIDEO",
        BlockType.Audio => "AUDIO",
        BlockType.File => "FILE",
        BlockType.Markdown => "MARKDOWN",
        BlockType.Flashcard => "FLASHCARD",
        BlockType.Question => "QUESTION",
        BlockType.Assignment => "ASSIGNMENT",
        BlockType.Quiz => "QUIZ",
        _ => "RICH_TEXT"
    };

    public static string FormatAiReviewStatus(AiReviewStatus status) => status switch
    {
        AiReviewStatus.Pending => "PENDING",
        AiReviewStatus.Approved => "APPROVED",
        _ => "NOT_APPLICABLE"
    };

    public static string FormatQuizResultDisplay(QuizResultDisplay display) => display switch
    {
        QuizResultDisplay.AfterEachAnswer => "AFTER_EACH_ANSWER",
        QuizResultDisplay.AfterSubmit => "AFTER_SUBMIT",
        QuizResultDisplay.AfterClose => "AFTER_CLOSE",
        QuizResultDisplay.AfterGrading => "AFTER_GRADING",
        _ => "AFTER_SUBMIT"
    };

    public static string? FormatQuestionType(QuestionType? type) => type switch
    {
        null => null,
        QuestionType.MultipleChoice => "MULTIPLE_CHOICE",
        QuestionType.TrueFalse => "TRUE_FALSE",
        QuestionType.FillBlank => "FILL_BLANK",
        QuestionType.Matching => "MATCHING",
        QuestionType.ShortEssay => "SHORT_ESSAY",
        QuestionType.Essay => "ESSAY",
        _ => type.Value.ToString().ToUpperInvariant()
    };

    public static async Task<ChapterDetailDto> MapToDetailDtoAsync(
        Chapter chapter,
        IReadOnlyList<Block> blocks,
        IContentRepository contentRepository,
        CancellationToken ct)
    {
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
                    // Ignore malformed flashcards JSON in draft
                }
            }

            QuizConfigDto? quizConfigDto = null;
            if (b.BlockType == BlockType.Quiz)
            {
                QuizConfig? qc = await contentRepository.GetQuizConfigAsync(b.Id, ct);
                if (qc is not null)
                {
                    IReadOnlyList<QuizQuestion> qq = await contentRepository.GetQuizQuestionsAsync(b.Id, ct);
                    IReadOnlyList<QuizRandomRule> qr = await contentRepository.GetQuizRandomRulesAsync(b.Id, ct);
                    IReadOnlyList<QuizPrerequisite> qp = await contentRepository.GetQuizPrerequisitesAsync(b.Id, ct);

                    quizConfigDto = new QuizConfigDto(
                        qc.OpenAt,
                        qc.CloseAt,
                        qc.TimeLimitMinutes,
                        qc.MaxAttempts,
                        qc.PassScore,
                        FormatQuizResultDisplay(qc.ResultDisplay),
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
                            FormatQuestionType(r.FilterQuestionType))).ToList(),
                        qp.Select(p => new QuizPrerequisiteDto(p.TargetKind.ToString().ToUpperInvariant(), p.TargetId)).ToList());
                }
            }

            AssignmentConfigDto? assignmentConfigDto = null;
            if (b.BlockType == BlockType.Assignment)
            {
                AssignmentConfig? ac = await contentRepository.GetAssignmentConfigAsync(b.Id, ct);
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
                FormatBlockType(b.BlockType),
                b.Position,
                b.Title,
                b.Body,
                b.ResourceId,
                b.QuestionId,
                flashcards,
                FormatAiReviewStatus(b.AiReviewStatus),
                quizConfigDto,
                assignmentConfigDto));
        }

        return new ChapterDetailDto(
            chapter.Id,
            chapter.CourseId,
            chapter.Position,
            chapter.Title,
            chapter.Description,
            chapter.Status.ToString().ToUpperInvariant(),
            chapter.LastVersionNo,
            chapter.PublishedVersionNo,
            blockDtos);
    }
}
