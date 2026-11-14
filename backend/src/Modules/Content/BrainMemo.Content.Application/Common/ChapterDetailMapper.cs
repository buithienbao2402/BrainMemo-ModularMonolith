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
