using BrainMemo.Content.Contracts;
using BrainMemo.Content.Contracts.Dtos;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Common;

public static class LearningProgressCalculator
{
    public static async Task<CourseProgressDto> CalculateProgressAsync(
        Guid courseId,
        Guid userId,
        ILearningRepository learningRepository,
        IContentContract contentContract,
        CancellationToken ct = default)
    {
        IReadOnlyList<BlockCompletion> completions = await learningRepository
            .ListBlockCompletionsAsync(userId, courseId, ct)
            .ConfigureAwait(false);

        HashSet<Guid> completedBlockIds = completions.Select(c => c.BlockId).ToHashSet();
        DateTimeOffset? lastActivityAt = completions.OrderByDescending(c => c.CompletedAt).FirstOrDefault()?.CompletedAt;

        CourseCompletion? courseCompletion = await learningRepository
            .GetCourseCompletionAsync(userId, courseId, ct)
            .ConfigureAwait(false);

        Result<IReadOnlyList<ChapterInfoDto>> chaptersResult = contentContract.ListPublishedChapters(courseId);
        IReadOnlyList<ChapterInfoDto> publishedChapters = chaptersResult.IsSuccess ? chaptersResult.Value : [];

        List<Guid> completedChapterIds = [];
        List<ChapterProgressDto> chapterProgressList = [];
        int eligibleChaptersCount = 0;

        foreach (ChapterInfoDto ch in publishedChapters.OrderBy(c => c.Position))
        {
            Result<PublishedChapterContentDto> contentResult = contentContract.GetPublishedChapterContent(ch.Id);
            if (!contentResult.IsSuccess)
            {
                continue;
            }

            IReadOnlyList<PublishedBlockRef> blocks = contentResult.Value.Blocks;
            if (blocks.Count == 0)
            {
                // Chapter without published blocks is not counted in the ratio (DAC_TA 3.4.1)
                continue;
            }

            eligibleChaptersCount++;
            int completedInChapter = blocks.Count(b => completedBlockIds.Contains(b.BlockId));
            double chapterPercent = Math.Round((double)completedInChapter / blocks.Count * 100.0, 2);
            chapterProgressList.Add(new ChapterProgressDto(ch.Id, chapterPercent));

            if (completedInChapter == blocks.Count)
            {
                completedChapterIds.Add(ch.Id);
            }
        }

        double coursePercent = eligibleChaptersCount > 0
            ? Math.Round((double)completedChapterIds.Count / eligibleChaptersCount * 100.0, 2)
            : 0.0;

        return new CourseProgressDto(
            CourseId: courseId,
            Percent: coursePercent,
            CompletedChapterIds: completedChapterIds,
            Chapters: chapterProgressList,
            CompletedBlockIds: completedBlockIds.ToList(),
            LastActivityAt: lastActivityAt,
            CourseCompletedAt: courseCompletion?.CompletedAt);
    }
}
