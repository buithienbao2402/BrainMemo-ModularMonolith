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

    public async Task<QuestionBank?> GetQuestionBankByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await dbContext.QuestionBanks.FirstOrDefaultAsync(b => b.CourseId == courseId, ct);
    }

    public async Task AddQuestionBankAsync(QuestionBank bank, CancellationToken ct = default)
    {
        await dbContext.QuestionBanks.AddAsync(bank, ct);
    }

    public Task UpdateQuestionBankAsync(QuestionBank bank, CancellationToken ct = default)
    {
        dbContext.QuestionBanks.Update(bank);
        return Task.CompletedTask;
    }

    public async Task<(IReadOnlyList<Question> Items, int TotalCount)> ListQuestionsAsync(
        Guid courseId,
        string? tag,
        byte? difficultyCode,
        QuestionType? type,
        QuestionStatus? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var bank = await dbContext.QuestionBanks.FirstOrDefaultAsync(b => b.CourseId == courseId, ct);
        if (bank is null)
        {
            return (Array.Empty<Question>(), 0);
        }

        var query = dbContext.Questions.Where(q => q.BankId == bank.Id);

        if (status.HasValue)
        {
            query = query.Where(q => q.Status == status.Value);
        }

        if (type.HasValue)
        {
            query = query.Where(q => q.QuestionType == type.Value);
        }

        if (difficultyCode.HasValue)
        {
            query = query.Where(q => q.DifficultyCode == difficultyCode.Value);
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            string trimmedTag = tag.Trim();
            query = query.Where(q => dbContext.QuestionTags.Any(t => t.QuestionId == q.Id && t.Tag == trimmedTag));
        }

        int total = await query.CountAsync(ct);
        int clampedPage = page < 1 ? 1 : page;
        int clampedPageSize = pageSize < 1 ? 20 : pageSize;

        var items = await query.OrderByDescending(q => q.CreatedAt)
            .Skip((clampedPage - 1) * clampedPageSize)
            .Take(clampedPageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<IReadOnlyList<QuestionOption>> GetQuestionOptionsAsync(Guid questionId, CancellationToken ct = default)
    {
        return await dbContext.QuestionOptions
            .Where(o => o.QuestionId == questionId)
            .OrderBy(o => o.Position)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetQuestionTagsAsync(Guid questionId, CancellationToken ct = default)
    {
        return await dbContext.QuestionTags
            .Where(t => t.QuestionId == questionId)
            .Select(t => t.Tag)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<QuestionOption>>> GetOptionsForQuestionsAsync(IReadOnlyList<Guid> questionIds, CancellationToken ct = default)
    {
        var options = await dbContext.QuestionOptions
            .Where(o => questionIds.Contains(o.QuestionId))
            .ToListAsync(ct);

        return options.GroupBy(o => o.QuestionId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<QuestionOption>)g.OrderBy(o => o.Position).ToList());
    }

    public async Task<IReadOnlyDictionary<Guid, IReadOnlyList<string>>> GetTagsForQuestionsAsync(IReadOnlyList<Guid> questionIds, CancellationToken ct = default)
    {
        var tags = await dbContext.QuestionTags
            .Where(t => questionIds.Contains(t.QuestionId))
            .ToListAsync(ct);

        return tags.GroupBy(t => t.QuestionId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)g.Select(t => t.Tag).ToList());
    }

    public async Task AddQuestionWithOptionsAndTagsAsync(
        Question question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<string> tags,
        CancellationToken ct = default)
    {
        await dbContext.Questions.AddAsync(question, ct);
        if (options.Count > 0)
        {
            await dbContext.QuestionOptions.AddRangeAsync(options, ct);
        }

        if (tags.Count > 0)
        {
            var distinctTags = tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct();
            await dbContext.QuestionTags.AddRangeAsync(distinctTags.Select(t => new QuestionTag(question.Id, t)), ct);
        }
    }

    public async Task UpdateQuestionWithOptionsAndTagsAsync(
        Question question,
        IReadOnlyList<QuestionOption> options,
        IReadOnlyList<string> tags,
        CancellationToken ct = default)
    {
        dbContext.Questions.Update(question);

        var existingOpts = await dbContext.QuestionOptions.Where(o => o.QuestionId == question.Id).ToListAsync(ct);
        if (existingOpts.Count > 0)
        {
            dbContext.QuestionOptions.RemoveRange(existingOpts);
        }
        if (options.Count > 0)
        {
            await dbContext.QuestionOptions.AddRangeAsync(options, ct);
        }

        var existingTags = await dbContext.QuestionTags.Where(t => t.QuestionId == question.Id).ToListAsync(ct);
        if (existingTags.Count > 0)
        {
            dbContext.QuestionTags.RemoveRange(existingTags);
        }
        if (tags.Count > 0)
        {
            var distinctTags = tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct();
            await dbContext.QuestionTags.AddRangeAsync(distinctTags.Select(t => new QuestionTag(question.Id, t)), ct);
        }
    }

    public async Task<IReadOnlyList<(Guid BlockId, string Title)>> GetQuestionUsageQuizzesAsync(Guid questionId, CancellationToken ct = default)
    {
        var quizBlockIds = await dbContext.QuizQuestions
            .Where(q => q.QuestionId == questionId)
            .Select(q => q.QuizBlockId)
            .Distinct()
            .ToListAsync(ct);

        if (quizBlockIds.Count == 0)
        {
            return Array.Empty<(Guid BlockId, string Title)>();
        }

        var publishedTitles = await dbContext.PublishedBlocks.Where(pb => quizBlockIds.Contains(pb.BlockId))
            .Join(dbContext.Chapters, pb => pb.ChapterId, c => c.Id, (pb, c) => new { pb.BlockId, Title = c.Title })
            .ToListAsync(ct);

        var draftTitles = await dbContext.Blocks.Where(b => quizBlockIds.Contains(b.Id))
            .Select(b => new { BlockId = b.Id, Title = b.Title ?? "Quiz" })
            .ToListAsync(ct);

        var result = new List<(Guid BlockId, string Title)>();
        foreach (var id in quizBlockIds)
        {
            var pt = publishedTitles.FirstOrDefault(x => x.BlockId == id);
            if (pt != null)
            {
                result.Add((id, pt.Title));
                continue;
            }
            var dt = draftTitles.FirstOrDefault(x => x.BlockId == id);
            result.Add((id, dt?.Title ?? "Quiz"));
        }
        return result;
    }

    public async Task<IReadOnlyList<QuizException>> ListQuizExceptionsAsync(Guid quizBlockId, CancellationToken ct = default)
    {
        return await dbContext.QuizExceptions.Where(e => e.QuizBlockId == quizBlockId).ToListAsync(ct);
    }

    public async Task<QuizException?> GetQuizExceptionAsync(Guid quizBlockId, Guid userId, CancellationToken ct = default)
    {
        return await dbContext.QuizExceptions.FirstOrDefaultAsync(e => e.QuizBlockId == quizBlockId && e.UserId == userId, ct);
    }

    public async Task AddQuizExceptionAsync(QuizException exception, CancellationToken ct = default)
    {
        await dbContext.QuizExceptions.AddAsync(exception, ct);
    }

    public Task UpdateQuizExceptionAsync(QuizException exception, CancellationToken ct = default)
    {
        dbContext.QuizExceptions.Update(exception);
        return Task.CompletedTask;
    }

    public Task DeleteQuizExceptionAsync(QuizException exception, CancellationToken ct = default)
    {
        dbContext.QuizExceptions.Remove(exception);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<Question>> GetReadyCandidateQuestionsAsync(
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
            string trimmed = filterTag.Trim();
            query = query.Where(q => dbContext.QuestionTags.Any(t => t.QuestionId == q.Id && t.Tag == trimmed));
        }

        return await query.OrderBy(q => q.CreatedAt).ToListAsync(ct);
    }

    public async Task<Guid?> GetCourseIdByBlockIdAsync(Guid blockId, CancellationToken ct = default)
    {
        var pb = await dbContext.PublishedBlocks.FirstOrDefaultAsync(b => b.BlockId == blockId, ct);
        if (pb != null)
        {
            var c = await dbContext.Chapters.FirstOrDefaultAsync(ch => ch.Id == pb.ChapterId, ct);
            if (c != null) return c.CourseId;
        }

        var db = await dbContext.Blocks.FirstOrDefaultAsync(b => b.Id == blockId, ct);
        if (db != null)
        {
            var c = await dbContext.Chapters.FirstOrDefaultAsync(ch => ch.Id == db.ChapterId, ct);
            if (c != null) return c.CourseId;
        }

        return null;
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
