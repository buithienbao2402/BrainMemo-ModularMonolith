using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.SaveChapterDraft;

public sealed class SaveChapterDraftCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IHtmlSanitizer htmlSanitizer) : ICommandHandler<SaveChapterDraftCommand, ChapterDetailDto>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public async Task<Result<ChapterDetailDto>> Handle(SaveChapterDraftCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify owner permission
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
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can modify chapters."));
        }

        // 2. Lookup chapter
        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        // 3. Optimistic locking check (FR-CNT-16)
        if (request.BaseVersionNo != chapter.LastVersionNo)
        {
            return Result.Failure<ChapterDetailDto>(new Error(
                "VERSION_CONFLICT",
                $"Chapter has been modified by another session (baseVersionNo: {request.BaseVersionNo}, current: {chapter.LastVersionNo}). Please reload."));
        }

        // 4. Update chapter title/description
        Result updateDetailsResult = chapter.UpdateDetails(request.Title, request.Description);
        if (updateDetailsResult.IsFailure)
        {
            return Result.Failure<ChapterDetailDto>(updateDetailsResult.Error);
        }

        // 5. Validate & sanitize blocks
        var domainBlocks = new List<Block>();
        var sanitizedBlockDtos = new List<BlockDto>();

        for (int i = 0; i < request.Blocks.Count; i++)
        {
            BlockDto b = request.Blocks[i];

            string normalizedBlockType = b.BlockType?.Replace("_", string.Empty) ?? string.Empty;
            if (!Enum.TryParse<BlockType>(normalizedBlockType, true, out var blockType))
            {
                return Result.Failure<ChapterDetailDto>(new Error("INVALID_BLOCK_TYPE", $"Unknown block type '{b.BlockType}'."));
            }

            // Validation per block type
            switch (blockType)
            {
                case BlockType.RichText:
                case BlockType.Markdown:
                    if (string.IsNullOrWhiteSpace(b.Body))
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("BODY_REQUIRED", $"Body is required for {blockType} block."));
                    }
                    break;

                case BlockType.Image:
                case BlockType.Video:
                case BlockType.Audio:
                case BlockType.File:
                    if (b.ResourceId is null || b.ResourceId == Guid.Empty)
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("RESOURCE_REQUIRED", $"Resource ID is required for {blockType} block."));
                    }

                    Resource? resource = await contentRepository.GetResourceByIdAsync(b.ResourceId.Value, cancellationToken);
                    if (resource is null || resource.CourseId != request.CourseId || resource.IsDeleted)
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("RESOURCE_NOT_FOUND", $"Resource '{b.ResourceId}' not found or does not belong to this course."));
                    }
                    break;

                case BlockType.Flashcard:
                    if (b.Flashcards is null || b.Flashcards.Count == 0)
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("FLASHCARDS_REQUIRED", "Flashcards list cannot be empty."));
                    }
                    break;

                case BlockType.Question:
                    if (b.QuestionId is null || b.QuestionId == Guid.Empty)
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("QUESTION_REQUIRED", "Question ID is required for Question block."));
                    }
                    break;

                case BlockType.Quiz:
                case BlockType.Assignment:
                    if (string.IsNullOrWhiteSpace(b.Title))
                    {
                        return Result.Failure<ChapterDetailDto>(new Error("TITLE_REQUIRED", $"Title is required for {blockType} block."));
                    }
                    break;
            }

            string? sanitizedBody = b.Body is not null ? htmlSanitizer.Sanitize(b.Body) : null;
            string? flashcardsJson = b.Flashcards is not null ? JsonSerializer.Serialize(b.Flashcards, JsonOptions) : null;

            Enum.TryParse<AiReviewStatus>(b.AiReviewStatus, true, out var aiStatus);

            Guid blockId = b.Id != Guid.Empty ? b.Id : Guid.NewGuid();

            var block = new Block(
                blockId,
                chapter.Id,
                blockType,
                b.Position > 0 ? b.Position : (i + 1),
                b.Title,
                sanitizedBody,
                b.ResourceId,
                b.QuestionId,
                flashcardsJson,
                null,
                aiStatus);

            domainBlocks.Add(block);

            // Keep sanitized block DTO for response & snapshot
            sanitizedBlockDtos.Add(b with
            {
                Id = blockId,
                Position = block.Position,
                Body = sanitizedBody
            });
        }

        // 6. Save working blocks to db
        await contentRepository.ReplaceBlocksAsync(chapter.Id, domainBlocks, cancellationToken);

        // 7. Save sub-configs for Quiz and Assignment
        foreach (BlockDto b in sanitizedBlockDtos)
        {
            if (b.BlockType.Equals("Quiz", StringComparison.OrdinalIgnoreCase) && b.QuizConfig is not null)
            {
                QuizConfigDto qc = b.QuizConfig;
                Enum.TryParse<QuizResultDisplay>(qc.ResultDisplay, true, out var display);

                var quizConfig = new QuizConfig(
                    b.Id,
                    qc.OpenAt,
                    qc.CloseAt,
                    qc.TimeLimitMinutes.HasValue ? (ushort)qc.TimeLimitMinutes.Value : null,
                    qc.MaxAttempts.HasValue ? (ushort)qc.MaxAttempts.Value : (ushort)1,
                    qc.PassScore,
                    display,
                    qc.ShuffleQuestions,
                    qc.ShuffleOptions,
                    qc.Password);

                var quizQuestions = qc.Questions?
                    .Select(q => new QuizQuestion(b.Id, q.QuestionId, q.Position, q.Points))
                    .ToList();

                var quizRules = qc.RandomRules?
                    .Select(r =>
                    {
                        Enum.TryParse<QuestionType>(r.FilterQuestionType, true, out var qType);
                        return new QuizRandomRule(
                            Guid.NewGuid(),
                            b.Id,
                            (ushort)r.Position,
                            (ushort)r.PickCount,
                            r.PointsEach,
                            r.FilterTag,
                            r.FilterDifficultyCode.HasValue ? (byte)r.FilterDifficultyCode.Value : null,
                            r.FilterQuestionType is not null ? qType : null);
                    })
                    .ToList();

                var quizPrereqs = qc.Prerequisites?
                    .Select(p =>
                    {
                        Enum.TryParse<QuizPrerequisiteKind>(p.TargetKind, true, out var kind);
                        return new QuizPrerequisite(Guid.NewGuid(), b.Id, kind, p.TargetId);
                    })
                    .ToList();

                await contentRepository.SaveQuizConfigAsync(quizConfig, quizQuestions, quizRules, quizPrereqs, cancellationToken);
            }
            else if (b.BlockType.Equals("Assignment", StringComparison.OrdinalIgnoreCase) && b.AssignmentConfig is not null)
            {
                AssignmentConfigDto ac = b.AssignmentConfig;
                var assignmentConfig = new AssignmentConfig(
                    b.Id,
                    ac.DueAt,
                    ac.MaxPoints,
                    ac.MaxFileSizeBytes > 0 ? (uint)ac.MaxFileSizeBytes : 20971520);

                await contentRepository.SaveAssignmentConfigAsync(assignmentConfig, cancellationToken);
            }
        }

        // 8. Build immutable snapshot JSON (schemaVersion=1, NO answer keys/options)
        var snapshotObj = new
        {
            schemaVersion = 1,
            title = chapter.Title,
            description = chapter.Description,
            blocks = sanitizedBlockDtos.Select(b => new
            {
                id = b.Id,
                blockType = b.BlockType,
                position = b.Position,
                title = b.Title,
                body = b.Body,
                resourceId = b.ResourceId,
                questionId = b.QuestionId,
                flashcards = b.Flashcards,
                aiReviewStatus = b.AiReviewStatus,
                quizConfig = b.QuizConfig is null ? null : new
                {
                    openAt = b.QuizConfig.OpenAt,
                    closeAt = b.QuizConfig.CloseAt,
                    timeLimitMinutes = b.QuizConfig.TimeLimitMinutes,
                    maxAttempts = b.QuizConfig.MaxAttempts,
                    passScore = b.QuizConfig.PassScore,
                    resultDisplay = b.QuizConfig.ResultDisplay,
                    shuffleQuestions = b.QuizConfig.ShuffleQuestions,
                    shuffleOptions = b.QuizConfig.ShuffleOptions,
                    hasPassword = b.QuizConfig.HasPassword,
                    questions = b.QuizConfig.Questions?.Select(q => new
                    {
                        questionId = q.QuestionId,
                        position = q.Position,
                        points = q.Points
                    }),
                    randomRules = b.QuizConfig.RandomRules
                },
                assignmentConfig = b.AssignmentConfig
            })
        };

        string snapshotJson = JsonSerializer.Serialize(snapshotObj, JsonOptions);

        int newVersionNo = chapter.LastVersionNo + 1;
        var newVersion = new ChapterVersion(Guid.NewGuid(), chapter.Id, newVersionNo, snapshotJson);
        await contentRepository.AddChapterVersionAsync(newVersion, cancellationToken);

        chapter.IncrementVersion();
        await contentRepository.UpdateChapterAsync(chapter, cancellationToken);

        await contentRepository.SaveChangesAsync(cancellationToken);

        var resultDto = new ChapterDetailDto(
            chapter.Id,
            chapter.CourseId,
            chapter.Position,
            chapter.Title,
            chapter.Description,
            chapter.Status.ToString().ToUpperInvariant(),
            chapter.LastVersionNo,
            chapter.PublishedVersionNo,
            sanitizedBlockDtos);

        return Result.Success(resultDto);
    }
}
