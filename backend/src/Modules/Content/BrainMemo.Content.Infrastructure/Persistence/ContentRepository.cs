using BrainMemo.Content.Application.Abstractions;
using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Content.Infrastructure.Persistence;

public class ContentRepository(ContentDbContext dbContext) : IContentRepository
{
    public async Task<Chapter?> GetChapterByIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId, ct);
    }

    public async Task<IReadOnlyList<Chapter>> ListChaptersByCourseIdAsync(Guid courseId, bool includeDrafts, CancellationToken ct = default)
    {
        IQueryable<Chapter> query = dbContext.Chapters
            .Where(c => c.CourseId == courseId && c.DeletedAt == null);

        if (!includeDrafts)
        {
            query = query.Where(c => c.Status == ChapterStatus.Published);
        }

        return await query.OrderBy(c => c.Position).ToListAsync(ct);
    }

    public async Task<int> GetMaxChapterPositionAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Chapters
            .Where(c => c.CourseId == courseId && c.DeletedAt == null)
            .MaxAsync(c => (int?)c.Position, ct) ?? 0;
    }

    public async Task AddChapterAsync(Chapter chapter, CancellationToken ct = default)
    {
        await dbContext.Chapters.AddAsync(chapter, ct);
    }

    public Task UpdateChapterAsync(Chapter chapter, CancellationToken ct = default)
    {
        dbContext.Chapters.Update(chapter);
        return Task.CompletedTask;
    }

    public async Task AddChapterVersionAsync(ChapterVersion version, CancellationToken ct = default)
    {
        await dbContext.ChapterVersions.AddAsync(version, ct);
    }

    public async Task<ChapterVersion?> GetChapterVersionAsync(Guid chapterId, int versionNo, CancellationToken ct = default)
    {
        return await dbContext.ChapterVersions
            .FirstOrDefaultAsync(v => v.ChapterId == chapterId && v.VersionNo == versionNo, ct);
    }

    public async Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.ChapterVersions
            .Where(v => v.ChapterId == chapterId)
            .OrderByDescending(v => v.VersionNo)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsPagedAsync(Guid chapterId, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        return await dbContext.ChapterVersions
            .Where(v => v.ChapterId == chapterId)
            .OrderByDescending(v => v.VersionNo)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Block>> GetBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.Blocks
            .Where(b => b.ChapterId == chapterId)
            .OrderBy(b => b.Position)
            .ToListAsync(ct);
    }

    public async Task ReplaceBlocksAsync(Guid chapterId, IReadOnlyList<Block> blocks, CancellationToken ct = default)
    {
        var existingBlocks = await dbContext.Blocks
            .Where(b => b.ChapterId == chapterId)
            .ToListAsync(ct);

        if (existingBlocks.Count > 0)
        {
            dbContext.Blocks.RemoveRange(existingBlocks);
        }

        await dbContext.Blocks.AddRangeAsync(blocks, ct);
    }

    public async Task<IReadOnlyList<PublishedBlock>> GetPublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        return await dbContext.PublishedBlocks
            .Where(p => p.ChapterId == chapterId)
            .OrderBy(p => p.Position)
            .ToListAsync(ct);
    }

    public async Task ReplacePublishedBlocksAsync(Guid chapterId, IReadOnlyList<PublishedBlock> blocks, CancellationToken ct = default)
    {
        var existing = await dbContext.PublishedBlocks
            .Where(p => p.ChapterId == chapterId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            dbContext.PublishedBlocks.RemoveRange(existing);
        }

        await dbContext.PublishedBlocks.AddRangeAsync(blocks, ct);
    }

    public async Task DeletePublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default)
    {
        var existing = await dbContext.PublishedBlocks
            .Where(p => p.ChapterId == chapterId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            dbContext.PublishedBlocks.RemoveRange(existing);
        }
    }

    public async Task<PublishedBlock?> GetPublishedBlockByIdAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.PublishedBlocks
            .FirstOrDefaultAsync(p => p.BlockId == blockId, ct);
    }

    public async Task<IReadOnlyList<PublishedBlock>> ListPublishedBlocksAsync(
        Guid? courseId,
        Guid? chapterId,
        Guid? afterId,
        int limit,
        CancellationToken ct = default)
    {
        var query = from pb in dbContext.PublishedBlocks
                    join c in dbContext.Chapters on pb.ChapterId equals c.Id
                    where c.DeletedAt == null && c.Status == ChapterStatus.Published
                    select new { pb, c };

        if (courseId.HasValue)
        {
            query = query.Where(x => x.c.CourseId == courseId.Value);
        }

        if (chapterId.HasValue)
        {
            query = query.Where(x => x.pb.ChapterId == chapterId.Value);
        }

        var list = await query.OrderBy(x => x.c.Position)
                              .ThenBy(x => x.pb.Position)
                              .Select(x => x.pb)
                              .ToListAsync(ct);

        if (afterId.HasValue)
        {
            int index = list.FindIndex(b => b.BlockId == afterId.Value);
            if (index >= 0)
            {
                return list.Skip(index + 1).Take(limit).ToList();
            }
        }

        return list.Take(limit).ToList();
    }

    public async Task<Question?> GetQuestionByIdAsync(Guid questionId, CancellationToken ct = default)
    {
        return await dbContext.Questions.FirstOrDefaultAsync(q => q.Id == questionId, ct);
    }

    public async Task<IReadOnlyList<Question>> GetQuestionsByIdsAsync(IReadOnlyList<Guid> questionIds, CancellationToken ct = default)
    {
        return await dbContext.Questions.Where(q => questionIds.Contains(q.Id)).ToListAsync(ct);
    }

    public async Task<int> CountReadyQuestionsAsync(
        Guid courseId,
        string? filterTag,
        byte? filterDifficultyCode,
        QuestionType? filterQuestionType,
        CancellationToken ct = default)
    {
        var query = from q in dbContext.Questions
                    join b in dbContext.QuestionBanks on q.BankId equals b.Id
                    where b.CourseId == courseId && q.Status == QuestionStatus.Ready
                    select q;

        if (filterDifficultyCode.HasValue)
        {
            query = query.Where(q => q.DifficultyCode == filterDifficultyCode.Value);
        }

        if (filterQuestionType.HasValue)
        {
            query = query.Where(q => q.QuestionType == filterQuestionType.Value);
        }

        if (!string.IsNullOrWhiteSpace(filterTag))
        {
            string tag = filterTag.Trim();
            query = query.Where(q => dbContext.QuestionTags.Any(t => t.QuestionId == q.Id && t.Tag == tag));
        }

        return await query.CountAsync(ct);
    }

    public async Task SaveQuizConfigAsync(
        QuizConfig config,
        IReadOnlyList<QuizQuestion>? questions,
        IReadOnlyList<QuizRandomRule>? rules,
        IReadOnlyList<QuizPrerequisite>? prerequisites,
        CancellationToken ct = default)
    {
        var existingConfig = await dbContext.QuizConfigs.FirstOrDefaultAsync(c => c.BlockId == config.BlockId, ct);
        if (existingConfig is null)
        {
            await dbContext.QuizConfigs.AddAsync(config, ct);
        }
        else
        {
            existingConfig.Update(
                config.OpenAt,
                config.CloseAt,
                config.TimeLimitMinutes,
                config.MaxAttempts,
                config.PassScore,
                config.ResultDisplay,
                config.ShuffleQuestions,
                config.ShuffleOptions,
                config.PasswordHash);
        }

        var existingQuestions = await dbContext.QuizQuestions.Where(q => q.QuizBlockId == config.BlockId).ToListAsync(ct);
        if (existingQuestions.Count > 0) dbContext.QuizQuestions.RemoveRange(existingQuestions);
        if (questions is not null && questions.Count > 0) await dbContext.QuizQuestions.AddRangeAsync(questions, ct);

        var existingRules = await dbContext.QuizRandomRules.Where(r => r.QuizBlockId == config.BlockId).ToListAsync(ct);
        if (existingRules.Count > 0) dbContext.QuizRandomRules.RemoveRange(existingRules);
        if (rules is not null && rules.Count > 0) await dbContext.QuizRandomRules.AddRangeAsync(rules, ct);

        var existingPrereqs = await dbContext.QuizPrerequisites.Where(p => p.QuizBlockId == config.BlockId).ToListAsync(ct);
        if (existingPrereqs.Count > 0) dbContext.QuizPrerequisites.RemoveRange(existingPrereqs);
        if (prerequisites is not null && prerequisites.Count > 0) await dbContext.QuizPrerequisites.AddRangeAsync(prerequisites, ct);
    }

    public async Task SaveAssignmentConfigAsync(AssignmentConfig config, CancellationToken ct = default)
    {
        var existingConfig = await dbContext.AssignmentConfigs.FirstOrDefaultAsync(a => a.BlockId == config.BlockId, ct);
        if (existingConfig is null)
        {
            await dbContext.AssignmentConfigs.AddAsync(config, ct);
        }
        else
        {
            existingConfig.Update(config.DueAt, config.MaxPoints, config.MaxFileSizeBytes);
        }
    }

    public async Task<QuizConfig?> GetQuizConfigAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.QuizConfigs.FirstOrDefaultAsync(c => c.BlockId == blockId, ct);
    }

    public async Task<IReadOnlyList<QuizQuestion>> GetQuizQuestionsAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.QuizQuestions.Where(q => q.QuizBlockId == blockId).OrderBy(q => q.Position).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<QuizRandomRule>> GetQuizRandomRulesAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.QuizRandomRules.Where(r => r.QuizBlockId == blockId).OrderBy(r => r.Position).ToListAsync(ct);
    }

    public async Task<IReadOnlyList<QuizPrerequisite>> GetQuizPrerequisitesAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.QuizPrerequisites.Where(p => p.QuizBlockId == blockId).ToListAsync(ct);
    }

    public async Task<AssignmentConfig?> GetAssignmentConfigAsync(Guid blockId, CancellationToken ct = default)
    {
        return await dbContext.AssignmentConfigs.FirstOrDefaultAsync(a => a.BlockId == blockId, ct);
    }

    public async Task<Resource?> GetResourceByIdAsync(Guid resourceId, CancellationToken ct = default)
    {
        return await dbContext.Resources.FirstOrDefaultAsync(r => r.Id == resourceId, ct);
    }

    public async Task<IReadOnlyList<Resource>> ListResourcesByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.Resources
            .Where(r => r.CourseId == courseId && r.DeletedAt == null)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddResourceAsync(Resource resource, CancellationToken ct = default)
    {
        await dbContext.Resources.AddAsync(resource, ct);
    }

    public Task UpdateResourceAsync(Resource resource, CancellationToken ct = default)
    {
        dbContext.Resources.Update(resource);
        return Task.CompletedTask;
    }

    public async Task<bool> IsResourceInUseAsync(Guid resourceId, CancellationToken ct = default)
    {
        return await dbContext.Blocks.AnyAsync(b => b.ResourceId == resourceId, ct)
            || await dbContext.PublishedBlocks.AnyAsync(p => p.ResourceId == resourceId, ct);
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await dbContext.SaveChangesAsync(ct);
    }
}
