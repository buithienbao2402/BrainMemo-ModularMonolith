using BrainMemo.Assessment.Domain.Entities;

namespace BrainMemo.Assessment.Application.Abstractions;

public interface IAssessmentRepository
{
    Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default);
    Task<GradeRecord?> GetGradeRecordBySourceSubmissionIdAsync(Guid sourceSubmissionId, CancellationToken ct = default);
    Task<GradeRecord?> GetGradeRecordByIdAsync(Guid id, CancellationToken ct = default);
    Task<AssessmentComponent?> GetComponentByIdAsync(Guid componentId, CancellationToken ct = default);
    Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default);
    Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1.0m, CancellationToken ct = default);
    Task<IReadOnlyList<AssessmentComponent>> GetComponentsByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task DeleteComponentAsync(AssessmentComponent component, CancellationToken ct = default);
    Task<bool> HasGradeRecordsForComponentAsync(Guid componentId, CancellationToken ct = default);
    Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<AssessmentConfig> GetOrCreateConfigAsync(Guid courseId, CancellationToken ct = default);
    Task AddConfigAsync(AssessmentConfig config, CancellationToken ct = default);
    Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForComponentAsync(Guid courseId, Guid componentId, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind = null, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind = null, CancellationToken ct = default);
    Task<IReadOnlyList<Clo>> GetClosByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<Clo?> GetCloByIdAsync(Guid id, CancellationToken ct = default);
    Task<Clo?> GetCloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default);
    Task AddCloAsync(Clo clo, CancellationToken ct = default);
    Task DeleteCloAsync(Clo clo, CancellationToken ct = default);
    Task<bool> HasOutcomeWeightsForCloAsync(Guid cloId, CancellationToken ct = default);
    Task<IReadOnlyList<Plo>> GetPlosByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<Plo?> GetPloByIdAsync(Guid id, CancellationToken ct = default);
    Task<Plo?> GetPloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default);
    Task AddPloAsync(Plo plo, CancellationToken ct = default);
    Task DeletePloAsync(Plo plo, CancellationToken ct = default);
    Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByComponentIdAsync(Guid componentId, CancellationToken ct = default);
    Task ReplaceComponentOutcomeWeightsAsync(Guid componentId, IEnumerable<ComponentOutcomeWeight> weights, CancellationToken ct = default);
    Task<CourseReview?> GetReviewByCourseAndUserAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<CourseReview?> GetReviewByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<CourseReview>> GetReviewsByCourseIdAsync(Guid courseId, int page, int pageSize, CancellationToken ct = default);
    Task<int> CountReviewsByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task<(decimal? AvgRating, int TotalCount, Dictionary<int, int> Distribution)> GetCourseReviewStatsAsync(Guid courseId, CancellationToken ct = default);
    Task AddReviewAsync(CourseReview review, CancellationToken ct = default);
    Task DeleteReviewAsync(CourseReview review, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
