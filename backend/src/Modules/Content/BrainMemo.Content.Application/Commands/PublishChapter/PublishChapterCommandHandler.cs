using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Application.Common;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Content.Contracts.Events;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Application.Commands.PublishChapter;

public sealed class PublishChapterCommandHandler(
    IContentRepository contentRepository,
    ICourseContract courseContract,
    IEventBus eventBus) : ICommandHandler<PublishChapterCommand, ChapterDetailDto>
{
    public async Task<Result<ChapterDetailDto>> Handle(PublishChapterCommand request, CancellationToken cancellationToken)
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
            return Result.Failure<ChapterDetailDto>(new Error("FORBIDDEN", "Only the course owner can publish chapters."));
        }

        // 2. Lookup chapter
        Chapter? chapter = await contentRepository.GetChapterByIdAsync(request.ChapterId, cancellationToken);
        if (chapter is null || chapter.CourseId != request.CourseId || chapter.IsDeleted)
        {
            return Result.Failure<ChapterDetailDto>(new Error("CHAPTER_NOT_FOUND", "Chapter not found."));
        }

        // 3. If already published and no new draft changes, return current detail
        if (chapter.Status == ChapterStatus.Published && chapter.PublishedVersionNo == chapter.LastVersionNo)
        {
            IReadOnlyList<Block> currentWorkingBlocks = await contentRepository.GetBlocksByChapterIdAsync(chapter.Id, cancellationToken);
            ChapterDetailDto currentDetail = await ChapterDetailMapper.MapToDetailDtoAsync(chapter, currentWorkingBlocks, contentRepository, cancellationToken);
            return Result.Success(currentDetail);
        }

        // 4. Validate prerequisites per §3.6.6.3
        IReadOnlyList<Block> blocks = await contentRepository.GetBlocksByChapterIdAsync(chapter.Id, cancellationToken);
        List<string> errors = [];

        // Prerequisite 1: Flashcards created by AI must be approved (not PENDING)
        if (blocks.Any(b => b.BlockType == BlockType.Flashcard && b.AiReviewStatus == AiReviewStatus.Pending))
        {
            errors.Add("Chương có thẻ ghi nhớ (flashcard) AI đang chờ duyệt (PENDING). Vui lòng duyệt hoặc xóa trước khi đăng tải.");
        }

        // Prerequisite 2: Referenced resources must exist and not be soft-deleted
        var resourceIds = blocks.Where(b => b.ResourceId.HasValue).Select(b => b.ResourceId!.Value).Distinct().ToList();
        foreach (Guid resourceId in resourceIds)
        {
            Resource? res = await contentRepository.GetResourceByIdAsync(resourceId, cancellationToken);
            if (res is null || res.IsDeleted)
            {
                errors.Add($"Tài nguyên đính kèm '{resourceId}' không tồn tại hoặc đã bị xóa.");
            }
        }

        // Prerequisite 3: Question blocks must refer to existing questions
        var questionBlocks = blocks.Where(b => b.BlockType == BlockType.Question && b.QuestionId.HasValue).ToList();
        foreach (Block qb in questionBlocks)
        {
            Question? q = await contentRepository.GetQuestionByIdAsync(qb.QuestionId!.Value, cancellationToken);
            if (q is null)
            {
                errors.Add($"Câu hỏi '{qb.QuestionId}' không tồn tại.");
            }
        }

        // Prerequisite 4: Quiz blocks validation
        var quizBlocks = blocks.Where(b => b.BlockType == BlockType.Quiz).ToList();
        foreach (Block qb in quizBlocks)
        {
            QuizConfig? qc = await contentRepository.GetQuizConfigAsync(qb.Id, cancellationToken);
            if (qc is not null)
            {
                if (qc.OpenAt.HasValue && qc.CloseAt.HasValue && qc.OpenAt.Value >= qc.CloseAt.Value)
                {
                    errors.Add($"Bài kiểm tra '{qb.Title ?? qb.Id.ToString()}' có thời gian mở không thể sau hoặc bằng thời gian đóng.");
                }

                IReadOnlyList<QuizQuestion> qq = await contentRepository.GetQuizQuestionsAsync(qb.Id, cancellationToken);
                foreach (QuizQuestion qItem in qq)
                {
                    Question? q = await contentRepository.GetQuestionByIdAsync(qItem.QuestionId, cancellationToken);
                    if (q is null || q.Status != QuestionStatus.Ready)
                    {
                        errors.Add($"Câu hỏi '{qItem.QuestionId}' trong bài kiểm tra '{qb.Title ?? qb.Id.ToString()}' không tồn tại hoặc chưa ở trạng thái sẵn sàng (READY).");
                    }
                }

                IReadOnlyList<QuizRandomRule> qr = await contentRepository.GetQuizRandomRulesAsync(qb.Id, cancellationToken);
                foreach (QuizRandomRule rule in qr)
                {
                    int readyCount = await contentRepository.CountReadyQuestionsAsync(
                        chapter.CourseId,
                        rule.FilterTag,
                        rule.FilterDifficultyCode,
                        rule.FilterQuestionType,
                        cancellationToken);

                    if (readyCount < rule.PickCount)
                    {
                        errors.Add($"Quy tắc ngẫu nhiên vị trí {rule.Position} yêu cầu {rule.PickCount} câu hỏi, nhưng chỉ có {readyCount} câu hỏi READY phù hợp trong ngân hàng câu hỏi.");
                    }
                }
            }
        }

        if (errors.Count > 0)
        {
            var details = errors.Select(e => new ValidationFailureDetail("blocks", e)).ToList();
            return Result.Failure<ChapterDetailDto>(new Error(
                ErrorCodes.ChapterPublishBlocked,
                "Chương học chưa đủ điều kiện để đăng tải: " + string.Join("; ", errors),
                details));
        }

        // 5. Execute publishing in one transaction
        DateTimeOffset utcNow = DateTimeOffset.UtcNow;
        bool isFirstPublish = !chapter.PublishedVersionNo.HasValue;

        IReadOnlyList<PublishedBlock> oldPublishedBlocks = await contentRepository.GetPublishedBlocksByChapterIdAsync(chapter.Id, cancellationToken);
        var oldBlockIds = oldPublishedBlocks.Select(b => b.BlockId).ToHashSet();
        var currentBlockIds = blocks.Select(b => b.Id).ToHashSet();

        var addedBlockIds = blocks.Where(b => !oldBlockIds.Contains(b.Id)).Select(b => b.Id).ToList();
        var removedBlockIds = oldPublishedBlocks.Where(b => !currentBlockIds.Contains(b.BlockId)).Select(b => b.BlockId).ToList();

        Result pubResult = chapter.Publish(chapter.LastVersionNo, utcNow);
        if (pubResult.IsFailure)
        {
            return Result.Failure<ChapterDetailDto>(pubResult.Error);
        }

        await contentRepository.UpdateChapterAsync(chapter, cancellationToken);

        ChapterVersion? currentVersion = await contentRepository.GetChapterVersionAsync(chapter.Id, chapter.LastVersionNo, cancellationToken);
        currentVersion?.MarkPublished(utcNow);

        var newPublishedBlocks = blocks
            .Select(b => new PublishedBlock(b.Id, chapter.Id, b.BlockType, b.Position, b.ResourceId, b.QuestionId, chapter.LastVersionNo))
            .ToList();

        await contentRepository.ReplacePublishedBlocksAsync(chapter.Id, newPublishedBlocks, cancellationToken);

        await contentRepository.SaveChangesAsync(cancellationToken);

        // 6. Post-commit event dispatching via IEventBus (Content does not use outbox per §3.6.8 / ADR-02)
        await eventBus.Publish(new ChapterPublished(
            Guid.NewGuid(),
            utcNow,
            chapter.Id,
            chapter.CourseId,
            chapter.LastVersionNo,
            isFirstPublish,
            addedBlockIds,
            removedBlockIds), cancellationToken);

        ChapterDetailDto detail = await ChapterDetailMapper.MapToDetailDtoAsync(chapter, blocks, contentRepository, cancellationToken);
        return Result.Success(detail);
    }
}
