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
    ICourseContract courseContract) : IContentContract
{
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
        return Result.Failure<IReadOnlyList<AssessableBlockDto>>(new Error("NOT_IMPLEMENTED", "Assessable blocks query will be implemented in T-S3-BE-02."));
    }

    public Result<QuizDefinitionDto> GetPublishedQuizDefinition(Guid quizBlockId)
    {
        return Result.Failure<QuizDefinitionDto>(new Error("NOT_IMPLEMENTED", "Quiz definitions will be implemented in T-S3-BE-02."));
    }

    public Result VerifyQuizPassword(Guid quizBlockId, string password)
    {
        return Result.Failure(new Error("NOT_IMPLEMENTED", "Quiz password verification will be implemented in T-S3-BE-02."));
    }

    public Result<QuizExceptionDto?> GetQuizExceptions(Guid quizBlockId, Guid userId)
    {
        return Result.Failure<QuizExceptionDto?>(new Error("NOT_IMPLEMENTED", "Quiz exceptions will be implemented in T-S3-BE-02."));
    }

    public Result<DrawnQuizDto> DrawQuizQuestions(Guid quizBlockId)
    {
        return Result.Failure<DrawnQuizDto>(new Error("NOT_IMPLEMENTED", "Drawing quiz questions will be implemented in T-S3-BE-02."));
    }

    public Result<AssignmentDefinitionDto> GetAssignmentDefinition(Guid assignmentBlockId)
    {
        return Result.Failure<AssignmentDefinitionDto>(new Error("NOT_IMPLEMENTED", "Assignment definitions will be implemented in T-S3-BE-02."));
    }

    public Result<IReadOnlyList<QuestionDetailDto>> GetQuestionsByIds(IReadOnlyList<Guid> ids, bool includeAnswerKey)
    {
        return Result.Failure<IReadOnlyList<QuestionDetailDto>>(new Error("NOT_IMPLEMENTED", "Questions query will be implemented in T-S3-BE-02."));
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
