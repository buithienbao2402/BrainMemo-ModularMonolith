using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Events;
using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Common;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;

namespace BrainMemo.Learning.Application.Commands.CompleteBlock;

public sealed class CompleteBlockCommandHandler(
    ICourseContract courseContract,
    IContentContract contentContract,
    ILearningRepository learningRepository,
    IEventBus eventBus,
    IClock clock) : ICommandHandler<CompleteBlockCommand, CourseProgressDto>
{
    public async Task<Result<CourseProgressDto>> Handle(CompleteBlockCommand request, CancellationToken ct)
    {
        Result<PublishedBlockRef> blockResult = contentContract.GetPublishedBlock(request.BlockId);
        if (!blockResult.IsSuccess)
        {
            return Result.Failure<CourseProgressDto>(blockResult.Error);
        }

        PublishedBlockRef block = blockResult.Value;

        Result<ChapterAccessResult> accessResult = courseContract.CheckChapterAccess(request.CourseId, block.ChapterId, request.CurrentUserId);
        if (!accessResult.IsSuccess)
        {
            return Result.Failure<CourseProgressDto>(accessResult.Error);
        }

        ChapterAccessResult access = accessResult.Value;
        if (!access.Allowed || !access.CanSaveProgress)
        {
            return access.Reason switch
            {
                "NOT_ENROLLED" => Result.Failure<CourseProgressDto>(new Error("NOT_ENROLLED", "Cần ghi danh để ghi nhận tiến độ học tập.")),
                "PASSCODE_REQUIRED" => Result.Failure<CourseProgressDto>(new Error("PASSCODE_REQUIRED", "Chương yêu cầu mở khóa bằng passcode.")),
                _ => Result.Failure<CourseProgressDto>(Error.Forbidden("Không có quyền ghi nhận tiến độ học tập.")),
            };
        }

        DateTimeOffset now = clock.UtcNow;
        BlockCompletion? existing = await learningRepository
            .GetBlockCompletionAsync(request.CurrentUserId, request.BlockId, ct)
            .ConfigureAwait(false);

        if (existing is null)
        {
            LearningBlockType blockType = ParseBlockType(block.BlockType);
            BlockCompletion completion = new(
                id: Guid.NewGuid(),
                userId: request.CurrentUserId,
                courseId: request.CourseId,
                chapterId: block.ChapterId,
                blockId: request.BlockId,
                blockType: blockType,
                completedAt: now);

            await learningRepository.AddBlockCompletionAsync(completion, ct).ConfigureAwait(false);

            await eventBus.Publish(new BlockCompleted(
                EventId: Guid.NewGuid(),
                OccurredAt: now,
                UserId: request.CurrentUserId,
                CourseId: request.CourseId,
                ChapterId: block.ChapterId,
                BlockId: request.BlockId)).ConfigureAwait(false);

            // Check chapter completion
            Result<PublishedChapterContentDto> chapterContent = contentContract.GetPublishedChapterContent(block.ChapterId);
            if (chapterContent.IsSuccess && chapterContent.Value.Blocks.Count > 0)
            {
                IReadOnlyList<BlockCompletion> chapterCompletions = await learningRepository
                    .ListBlockCompletionsForChapterAsync(request.CurrentUserId, block.ChapterId, ct)
                    .ConfigureAwait(false);

                HashSet<Guid> completedBlockIds = chapterCompletions.Select(c => c.BlockId).ToHashSet();
                completedBlockIds.Add(request.BlockId);

                if (chapterContent.Value.Blocks.All(b => completedBlockIds.Contains(b.BlockId)))
                {
                    await eventBus.Publish(new ChapterCompleted(
                        EventId: Guid.NewGuid(),
                        OccurredAt: now,
                        UserId: request.CurrentUserId,
                        CourseId: request.CourseId,
                        ChapterId: block.ChapterId)).ConfigureAwait(false);
                }
            }

            // Check course completion
            CourseCompletion? courseComp = await learningRepository
                .GetCourseCompletionAsync(request.CurrentUserId, request.CourseId, ct)
                .ConfigureAwait(false);

            if (courseComp is null)
            {
                Result<IReadOnlyList<ChapterInfoDto>> publishedChaptersResult = contentContract.ListPublishedChapters(request.CourseId);
                if (publishedChaptersResult.IsSuccess)
                {
                    IReadOnlyList<BlockCompletion> allCompletions = await learningRepository
                        .ListBlockCompletionsAsync(request.CurrentUserId, request.CourseId, ct)
                        .ConfigureAwait(false);

                    HashSet<Guid> allCompletedBlockIds = allCompletions.Select(c => c.BlockId).ToHashSet();
                    allCompletedBlockIds.Add(request.BlockId);

                    bool allEligibleChaptersCompleted = true;
                    int eligibleChaptersCount = 0;

                    foreach (ChapterInfoDto ch in publishedChaptersResult.Value)
                    {
                        Result<PublishedChapterContentDto> chContent = contentContract.GetPublishedChapterContent(ch.Id);
                        if (!chContent.IsSuccess || chContent.Value.Blocks.Count == 0)
                        {
                            continue;
                        }

                        eligibleChaptersCount++;
                        if (!chContent.Value.Blocks.All(b => allCompletedBlockIds.Contains(b.BlockId)))
                        {
                            allEligibleChaptersCompleted = false;
                            break;
                        }
                    }

                    if (eligibleChaptersCount > 0 && allEligibleChaptersCompleted)
                    {
                        CourseCompletion newCourseComp = new(
                            id: Guid.NewGuid(),
                            userId: request.CurrentUserId,
                            courseId: request.CourseId,
                            completedAt: now);

                        await learningRepository.AddCourseCompletionAsync(newCourseComp, ct).ConfigureAwait(false);

                        await eventBus.Publish(new CourseCompleted(
                            EventId: Guid.NewGuid(),
                            OccurredAt: now,
                            UserId: request.CurrentUserId,
                            CourseId: request.CourseId)).ConfigureAwait(false);
                    }
                }
            }

            await learningRepository.SaveChangesAsync(ct).ConfigureAwait(false);
        }

        CourseProgressDto progress = await LearningProgressCalculator.CalculateProgressAsync(
            request.CourseId,
            request.CurrentUserId,
            learningRepository,
            contentContract,
            ct).ConfigureAwait(false);

        return Result.Success(progress);
    }

    private static LearningBlockType ParseBlockType(string raw)
    {
        string normalized = raw.Replace("_", "", StringComparison.OrdinalIgnoreCase);
        return Enum.TryParse(normalized, true, out LearningBlockType result)
            ? result
            : LearningBlockType.RichText;
    }
}
