using BrainMemo.Assessment.Domain.Entities;

namespace BrainMemo.Assessment.Application.Abstractions;

public interface IAssessmentRepository
{
    Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default);
    Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default);
    Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(Guid courseId, string sourceKind, Guid sourceBlockId, string title, decimal maxScore, decimal courseWeight = 1.0m, CancellationToken ct = default);
    Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default);
    Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
