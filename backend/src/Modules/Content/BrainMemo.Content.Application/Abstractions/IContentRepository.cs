using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;

namespace BrainMemo.Content.Application.Abstractions;

public interface IContentRepository
{
    Task<Chapter?> GetChapterByIdAsync(Guid chapterId, CancellationToken ct = default);
    Task<IReadOnlyList<Chapter>> ListChaptersByCourseIdAsync(Guid courseId, bool includeDrafts, CancellationToken ct = default);
    Task<int> GetMaxChapterPositionAsync(Guid courseId, CancellationToken ct = default);
    Task AddChapterAsync(Chapter chapter, CancellationToken ct = default);
    Task UpdateChapterAsync(Chapter chapter, CancellationToken ct = default);
    Task AddChapterVersionAsync(ChapterVersion version, CancellationToken ct = default);
    Task<ChapterVersion?> GetChapterVersionAsync(Guid chapterId, int versionNo, CancellationToken ct = default);
    Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsAsync(Guid chapterId, CancellationToken ct = default);
    Task<IReadOnlyList<ChapterVersion>> ListChapterVersionsPagedAsync(Guid chapterId, int page, int pageSize, CancellationToken ct = default);
    Task<IReadOnlyList<Block>> GetBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default);
    Task ReplaceBlocksAsync(Guid chapterId, IReadOnlyList<Block> blocks, CancellationToken ct = default);
    Task<IReadOnlyList<PublishedBlock>> GetPublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default);
    Task ReplacePublishedBlocksAsync(Guid chapterId, IReadOnlyList<PublishedBlock> blocks, CancellationToken ct = default);
    Task DeletePublishedBlocksByChapterIdAsync(Guid chapterId, CancellationToken ct = default);
    Task<PublishedBlock?> GetPublishedBlockByIdAsync(Guid blockId, CancellationToken ct = default);
    Task<IReadOnlyList<PublishedBlock>> ListPublishedBlocksAsync(Guid? courseId, Guid? chapterId, Guid? afterId, int limit, CancellationToken ct = default);
    Task<Question?> GetQuestionByIdAsync(Guid questionId, CancellationToken ct = default);
    Task<IReadOnlyList<Question>> GetQuestionsByIdsAsync(IReadOnlyList<Guid> questionIds, CancellationToken ct = default);
    Task<int> CountReadyQuestionsAsync(Guid courseId, string? filterTag, byte? filterDifficultyCode, QuestionType? filterQuestionType, CancellationToken ct = default);
    Task SaveQuizConfigAsync(
        QuizConfig config,
        IReadOnlyList<QuizQuestion>? questions,
        IReadOnlyList<QuizRandomRule>? rules,
        IReadOnlyList<QuizPrerequisite>? prerequisites,
        CancellationToken ct = default);
    Task SaveAssignmentConfigAsync(AssignmentConfig config, CancellationToken ct = default);
    Task<QuizConfig?> GetQuizConfigAsync(Guid blockId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizQuestion>> GetQuizQuestionsAsync(Guid blockId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizRandomRule>> GetQuizRandomRulesAsync(Guid blockId, CancellationToken ct = default);
    Task<IReadOnlyList<QuizPrerequisite>> GetQuizPrerequisitesAsync(Guid blockId, CancellationToken ct = default);
    Task<AssignmentConfig?> GetAssignmentConfigAsync(Guid blockId, CancellationToken ct = default);
    Task<Resource?> GetResourceByIdAsync(Guid resourceId, CancellationToken ct = default);
    Task<IReadOnlyList<Resource>> ListResourcesByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task AddResourceAsync(Resource resource, CancellationToken ct = default);
    Task UpdateResourceAsync(Resource resource, CancellationToken ct = default);
    Task<bool> IsResourceInUseAsync(Guid resourceId, CancellationToken ct = default);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
