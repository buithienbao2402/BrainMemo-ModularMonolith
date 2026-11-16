using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Content.Infrastructure.Contracts;

public class ContentContractService(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IQuizPasswordHasher? quizPasswordHasher = null) : IContentContract
{
    private readonly IQuizPasswordHasher _quizPasswordHasher = quizPasswordHasher ?? new Security.BCryptQuizPasswordHasher();
    public Result<ResourceAuthDto> AuthorizeResourceDownload(Guid resourceId, Guid? viewerUserId)
    {
        Resource? resource = contentRepository.GetResourceByIdAsync(resourceId).GetAwaiter().GetResult();
        if (resource is null || resource.IsDeleted)
        {
            return Result.Failure<ResourceAuthDto>(new Error("RESOURCE_NOT_FOUND", "Resource not found."));
        }

        Result<CourseAccessDto> accessResult = courseContract.GetCourseAccess(
            resource.CourseId,
            viewerUserId,
            AccessPurpose.Normal);

        if (accessResult.IsFailure || !accessResult.Value.Exists)
        {
            return Result.Failure<ResourceAuthDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (accessResult.Value.EffectiveState == "DELETED" && !accessResult.Value.IsOwner)
        {
            return Result.Failure<ResourceAuthDto>(new Error("COURSE_NOT_FOUND", "Course not found."));
        }

        if (!accessResult.Value.IsOwner && !accessResult.Value.CanReadContent)
        {
            return Result.Failure<ResourceAuthDto>(new Error("FORBIDDEN", "Viewer is not authorized to download this resource."));
        }

        var dto = new ResourceAuthDto(
            resource.Id,
            resource.StorageKey,
            resource.ContentType,
            resource.SizeBytes,
            resource.OriginalFilename);

        return Result.Success(dto);
    }

    public Result<IReadOnlyList<ChapterInfoDto>> GetChapterInfo(IReadOnlyList<Guid> chapterIds)
    {
        var result = new List<ChapterInfoDto>();
        foreach (Guid id in chapterIds)
        {
            Chapter? c = contentRepository.GetChapterByIdAsync(id).GetAwaiter().GetResult();
            if (c is not null && !c.IsDeleted)
            {
                result.Add(new ChapterInfoDto(
                    c.Id,
                    c.CourseId,
                    c.Position,
                    c.Title,
                    c.Description,
                    c.Status.ToString().ToUpperInvariant(),
                    c.LastVersionNo,
                    c.PublishedVersionNo,
                    c.FirstPublishedAt,
                    c.LastPublishedAt));
            }
        }

        return Result.Success<IReadOnlyList<ChapterInfoDto>>(result);
    }

    public Result<IReadOnlyList<ChapterInfoDto>> ListPublishedChapters(Guid courseId)
    {
        IReadOnlyList<Chapter> chapters = contentRepository.ListChaptersByCourseIdAsync(courseId, includeDrafts: false)
            .GetAwaiter().GetResult();

        var result = chapters
            .OrderBy(c => c.Position)
            .Select(c => new ChapterInfoDto(
                c.Id,
                c.CourseId,
                c.Position,
                c.Title,
                c.Description,
                c.Status.ToString().ToUpperInvariant(),
                c.LastVersionNo,
                c.PublishedVersionNo,
                c.FirstPublishedAt,
                c.LastPublishedAt))
            .ToList();

        return Result.Success<IReadOnlyList<ChapterInfoDto>>(result);
    }

    public Result<int> CountPublishedChapters(Guid courseId)
    {
        IReadOnlyList<Chapter> chapters = contentRepository.ListChaptersByCourseIdAsync(courseId, includeDrafts: false)
            .GetAwaiter().GetResult();

        return Result.Success(chapters.Count);
    }

    public Result<PublishedChapterContentDto> GetPublishedChapterContent(Guid chapterId)
    {
        Chapter? chapter = contentRepository.GetChapterByIdAsync(chapterId).GetAwaiter().GetResult();
        if (chapter is null || chapter.IsDeleted || chapter.Status != ChapterStatus.Published)
        {
            return Result.Failure<PublishedChapterContentDto>(new Error("CHAPTER_NOT_FOUND", "Published chapter not found."));
        }

        IReadOnlyList<PublishedBlock> blocks = contentRepository.GetPublishedBlocksByChapterIdAsync(chapterId).GetAwaiter().GetResult();

        var blockRefs = blocks.OrderBy(b => b.Position)
            .Select(b => new PublishedBlockRef(
                b.BlockId,
                b.ChapterId,
                b.BlockType.ToString().ToUpperInvariant(),
                b.Position,
                b.ResourceId,
                b.QuestionId,
                b.VersionNo))
            .ToList();

        var dto = new PublishedChapterContentDto(
            chapter.Id,
            chapter.CourseId,
            chapter.PublishedVersionNo ?? chapter.LastVersionNo,
            chapter.Title,
            chapter.Description,
            blockRefs);

        return Result.Success(dto);
    }

    public Result<IReadOnlyList<PublishedBlockRef>> ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit)
    {
        int clampedLimit = Math.Clamp(limit <= 0 ? 50 : limit, 1, 50);
        IReadOnlyList<PublishedBlock> blocks = contentRepository.ListPublishedBlocksAsync(courseId, chapterId, afterId, clampedLimit).GetAwaiter().GetResult();

        var refs = blocks
            .Select(b => new PublishedBlockRef(
                b.BlockId,
                b.ChapterId,
                b.BlockType.ToString().ToUpperInvariant(),
                b.Position,
                b.ResourceId,
                b.QuestionId,
                b.VersionNo))
            .ToList();

        return Result.Success<IReadOnlyList<PublishedBlockRef>>(refs);
    }

    public Result<PublishedBlockRef> GetPublishedBlock(Guid blockId)
    {
        PublishedBlock? block = contentRepository.GetPublishedBlockByIdAsync(blockId).GetAwaiter().GetResult();
        if (block is null)
        {
            return Result.Failure<PublishedBlockRef>(new Error("BLOCK_NOT_FOUND", "Published block not found."));
        }

        var dto = new PublishedBlockRef(
            block.BlockId,
            block.ChapterId,
            block.BlockType.ToString().ToUpperInvariant(),
            block.Position,
            block.ResourceId,
            block.QuestionId,
            block.VersionNo);

        return Result.Success(dto);
    }

    public Result<IReadOnlyList<AssessableBlockDto>> GetAssessableBlocks(Guid courseId)
    {
        IReadOnlyList<Chapter> chapters = contentRepository.ListChaptersByCourseIdAsync(courseId, includeDrafts: false)
            .GetAwaiter().GetResult();

        var result = new List<AssessableBlockDto>();

        foreach (Chapter chapter in chapters)
        {
            IReadOnlyList<PublishedBlock> blocks = contentRepository.GetPublishedBlocksByChapterIdAsync(chapter.Id)
                .GetAwaiter().GetResult();

            foreach (PublishedBlock b in blocks)
            {
                if (b.BlockType == BlockType.Quiz)
                {
                    IReadOnlyList<QuizQuestion> qq = contentRepository.GetQuizQuestionsAsync(b.BlockId).GetAwaiter().GetResult();
                    IReadOnlyList<QuizRandomRule> qr = contentRepository.GetQuizRandomRulesAsync(b.BlockId).GetAwaiter().GetResult();
                    decimal maxScore = qq.Sum(q => q.Points) + qr.Sum(r => r.PickCount * r.PointsEach);

                    result.Add(new AssessableBlockDto(
                        b.BlockId,
                        courseId,
                        chapter.Id,
                        "QUIZ",
                        chapter.Title,
                        maxScore));
                }
                else if (b.BlockType == BlockType.Assignment)
                {
                    AssignmentConfig? ac = contentRepository.GetAssignmentConfigAsync(b.BlockId).GetAwaiter().GetResult();
                    if (ac is not null && ac.MaxPoints.HasValue && ac.MaxPoints.Value > 0)
                    {
                        result.Add(new AssessableBlockDto(
                            b.BlockId,
                            courseId,
                            chapter.Id,
                            "ASSIGNMENT",
                            chapter.Title,
                            ac.MaxPoints.Value));
                    }
                }
            }
        }

        return Result.Success<IReadOnlyList<AssessableBlockDto>>(result);
    }

    public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId)
    {
        QuizConfig? qc = contentRepository.GetQuizConfigAsync(quizBlockId).GetAwaiter().GetResult();
        if (qc is null)
        {
            return Result.Failure<QuizDefinitionDto>(new Error("QUIZ_NOT_FOUND", "Quiz not found."));
        }

        var dto = new QuizDefinitionDto(
            quizBlockId,
            qc.PassScore,
            !string.IsNullOrEmpty(qc.PasswordHash),
            qc.ResultDisplay.ToString().ToUpperInvariant(),
            qc.TimeLimitMinutes,
            qc.MaxAttempts,
            qc.ShuffleQuestions,
            qc.ShuffleOptions);

        return Result.Success(dto);
    }

    public Result VerifyQuizPassword(Guid quizBlockId, string password)
    {
        QuizConfig? qc = contentRepository.GetQuizConfigAsync(quizBlockId).GetAwaiter().GetResult();
        if (qc is null)
        {
            return Result.Failure(new Error("QUIZ_NOT_FOUND", "Quiz not found."));
        }

        if (string.IsNullOrEmpty(qc.PasswordHash))
        {
            return Result.Success();
        }

        if (!_quizPasswordHasher.Verify(password, qc.PasswordHash))
        {
            return Result.Failure(new Error("QUIZ_PASSWORD_INVALID", "Mật khẩu bài thi không đúng."));
        }

        return Result.Success();
    }

    public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId)
    {
        QuizException? exception = contentRepository.GetQuizExceptionAsync(quizBlockId, userId).GetAwaiter().GetResult();
        if (exception is null)
        {
            return Result.Success<QuizExceptionDto?>(null);
        }

        var dto = new QuizExceptionDto(
            exception.UserId,
            exception.ExtraMinutes,
            exception.ExtraAttempts,
            exception.ExtendedCloseAt);

        return Result.Success<QuizExceptionDto?>(dto);
    }

    public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId)
    {
        QuizConfig? qc = contentRepository.GetQuizConfigAsync(quizBlockId).GetAwaiter().GetResult();
        if (qc is null)
        {
            return Result.Failure<DrawnQuizDto>(new Error("QUIZ_NOT_FOUND", "Quiz not found."));
        }

        Guid? courseId = contentRepository.GetCourseIdByBlockIdAsync(quizBlockId).GetAwaiter().GetResult();
        if (!courseId.HasValue)
        {
            return Result.Failure<DrawnQuizDto>(new Error("QUIZ_NOT_FOUND", "Khóa học của bài thi không tồn tại."));
        }

        var drawnQuestionIds = new List<Guid>();

        // 1. Manual questions (cnt_quiz_question) ordered by position
        IReadOnlyList<QuizQuestion> manualQuestions = contentRepository.GetQuizQuestionsAsync(quizBlockId).GetAwaiter().GetResult();
        foreach (QuizQuestion mq in manualQuestions.OrderBy(q => q.Position))
        {
            Question? q = contentRepository.GetQuestionByIdAsync(mq.QuestionId).GetAwaiter().GetResult();
            if (q is not null && q.Status == QuestionStatus.Ready && !drawnQuestionIds.Contains(q.Id))
            {
                drawnQuestionIds.Add(q.Id);
            }
        }

        // 2. Random rules (cnt_quiz_random_rule) ordered by position
        IReadOnlyList<QuizRandomRule> rules = contentRepository.GetQuizRandomRulesAsync(quizBlockId).GetAwaiter().GetResult();
        foreach (QuizRandomRule rule in rules.OrderBy(r => r.Position))
        {
            IReadOnlyList<Question> candidateQuestions = contentRepository.GetReadyCandidateQuestionsAsync(
                courseId.Value,
                rule.FilterTag,
                rule.FilterDifficultyCode,
                rule.FilterQuestionType).GetAwaiter().GetResult();

            var pool = candidateQuestions.Where(q => !drawnQuestionIds.Contains(q.Id)).ToList();
            if (pool.Count < rule.PickCount)
            {
                return Result.Failure<DrawnQuizDto>(new Error("NOT_ENOUGH_QUESTIONS", $"Không đủ câu hỏi hợp lệ trong ngân hàng câu hỏi cho quy tắc ngẫu nhiên vị trí {rule.Position}. Cần {rule.PickCount}, chỉ có {pool.Count}."));
            }

            var picked = pool.Take(rule.PickCount).Select(q => q.Id);
            drawnQuestionIds.AddRange(picked);
        }

        if (drawnQuestionIds.Count == 0)
        {
            return Result.Failure<DrawnQuizDto>(new Error("NOT_ENOUGH_QUESTIONS", "Bài thi không có câu hỏi nào."));
        }

        return Result.Success(new DrawnQuizDto(quizBlockId, drawnQuestionIds));
    }

    public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId)
    {
        return Result.Failure<AssignmentDefinitionDto>(new Error("NOT_IMPLEMENTED", "Assignment definitions will be implemented in T-S3-BE-02."));
    }

    public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey)
    {
        if (ids.Count == 0)
        {
            return Result.Success<IReadOnlyList<QuestionDetailDto>>([]);
        }

        IReadOnlyList<Question> questions = contentRepository.GetQuestionsByIdsAsync(ids).GetAwaiter().GetResult();
        IReadOnlyDictionary<Guid, IReadOnlyList<QuestionOption>> optionsMap = contentRepository.GetOptionsForQuestionsAsync(ids).GetAwaiter().GetResult();

        var dtos = new List<QuestionDetailDto>();
        foreach (Question q in questions)
        {
            optionsMap.TryGetValue(q.Id, out var options);
            options ??= [];

            var optionDtos = options.OrderBy(o => o.Position).Select(o => new QuestionOptionDto(
                o.Id,
                o.Position,
                o.Content,
                o.MatchContent,
                o.BlankNo,
                includeAnswerKey ? o.IsCorrect : null
            )).ToList();

            dtos.Add(new QuestionDetailDto(
                q.Id,
                q.QuestionType.ToString().ToUpperInvariant(),
                q.Stem,
                includeAnswerKey ? q.Explanation : null,
                includeAnswerKey ? q.ReferenceAnswer : null,
                q.DifficultyCode,
                q.DefaultPoints,
                optionDtos
            ));
        }

        var ordered = ids.Select(id => dtos.FirstOrDefault(d => d.Id == id)).OfType<QuestionDetailDto>().ToList();
        return Result.Success<IReadOnlyList<QuestionDetailDto>>(ordered);
    }

    public Result<PracticeQuestionDto> GetQuestionForPractice(Guid blockId)
    {
        return Result.Failure<PracticeQuestionDto>(new Error("NOT_IMPLEMENTED", "Practice questions will be implemented in T-S3-BE-02."));
    }

    public Result<PracticeResultDto> EvaluatePracticeAnswer(Guid blockId, AnswerPayload answer)
    {
        return Result.Failure<PracticeResultDto>(new Error("NOT_IMPLEMENTED", "Practice evaluation will be implemented in T-S3-BE-02."));
    }

    public Result ImportAiGeneratedQuestions(Guid courseId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<AiQuestionItem> items)
    {
        return Result.Failure(new Error("NOT_IMPLEMENTED", "AI question import will be implemented in T-S3-BE-02."));
    }

    public Result ImportAiGeneratedFlashcards(Guid chapterId, Guid requesterUserId, Guid aiJobId, IReadOnlyList<Flashcard> cards)
    {
        return Result.Failure(new Error("NOT_IMPLEMENTED", "AI flashcards import will be implemented in T-S3-BE-02."));
    }

    public Result<string> GetChapterTextForAi(Guid chapterId, Guid requesterUserId)
    {
        return Result.Failure<string>(new Error("NOT_IMPLEMENTED", "AI chapter text will be implemented in T-S3-BE-02."));
    }
}
