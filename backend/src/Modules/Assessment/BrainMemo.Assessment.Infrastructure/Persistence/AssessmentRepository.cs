using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BrainMemo.Assessment.Infrastructure.Persistence;

public class AssessmentRepository : IAssessmentRepository
{
    private readonly AssessmentDbContext _db;

    public AssessmentRepository(AssessmentDbContext db)
    {
        _db = db;
    }

    public async Task<GradeRecord?> GetGradeRecordBySourceAttemptIdAsync(Guid sourceAttemptId, CancellationToken ct = default)
    {
        return await _db.GradeRecords
            .FirstOrDefaultAsync(g => g.SourceAttemptId == sourceAttemptId, ct);
    }

    public async Task<GradeRecord?> GetGradeRecordBySourceSubmissionIdAsync(Guid sourceSubmissionId, CancellationToken ct = default)
    {
        return await _db.GradeRecords
            .FirstOrDefaultAsync(g => g.SourceSubmissionId == sourceSubmissionId, ct);
    }

    public async Task<GradeRecord?> GetGradeRecordByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.GradeRecords.FirstOrDefaultAsync(g => g.Id == id, ct);
    }

    public async Task<AssessmentComponent?> GetComponentByIdAsync(Guid componentId, CancellationToken ct = default)
    {
        return await _db.AssessmentComponents.FirstOrDefaultAsync(c => c.Id == componentId, ct);
    }

    public async Task<AssessmentComponent?> GetComponentByCourseAndBlockIdAsync(Guid courseId, Guid sourceBlockId, CancellationToken ct = default)
    {
        return await _db.AssessmentComponents
            .FirstOrDefaultAsync(c => c.CourseId == courseId && c.SourceBlockId == sourceBlockId, ct);
    }

    public async Task<AssessmentComponent> GetOrCreateDefaultComponentAsync(
        Guid courseId,
        string sourceKind,
        Guid sourceBlockId,
        string title,
        decimal maxScore,
        decimal courseWeight = 1.0m,
        CancellationToken ct = default)
    {
        var existing = await GetComponentByCourseAndBlockIdAsync(courseId, sourceBlockId, ct);
        if (existing != null)
        {
            return existing;
        }

        var component = new AssessmentComponent(
            Guid.NewGuid(),
            courseId,
            sourceKind,
            sourceBlockId,
            title,
            maxScore,
            courseWeight);

        await _db.AssessmentComponents.AddAsync(component, ct);
        return component;
    }

    public async Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.AssessmentConfigs
            .FirstOrDefaultAsync(c => c.CourseId == courseId, ct);
    }

    public async Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default)
    {
        var existing = await _db.GradeRecords.FirstOrDefaultAsync(g => g.Id == record.Id, ct);
        if (existing == null && record.SourceAttemptId.HasValue)
        {
            existing = await _db.GradeRecords.FirstOrDefaultAsync(g => g.SourceAttemptId == record.SourceAttemptId, ct);
        }

        if (existing == null)
        {
            await _db.GradeRecords.AddAsync(record, ct);
        }
        else
        {
            existing.UpdateScore(record.Score, record.MaxScore, record.IsFullyGraded, record.GradedAt, record.Feedback);
        }
    }

    public async Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForStudentAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await _db.GradeRecords
            .Where(g => g.CourseId == courseId && g.UserId == userId)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForCourseAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.GradeRecords
            .Where(g => g.CourseId == courseId)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<GradeRecord>> GetPendingGradingRecordsAsync(Guid courseId, string? kind = null, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var query = _db.GradeRecords.Where(g => g.CourseId == courseId && !g.IsFullyGraded);

        if (!string.IsNullOrWhiteSpace(kind))
        {
            if (kind.Equals("QUIZ_ATTEMPT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(g => g.RecordType == Domain.Enums.GradeRecordType.QuizAttempt);
            }
            else if (kind.Equals("ASSIGNMENT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(g => g.RecordType == Domain.Enums.GradeRecordType.AssignmentSubmission);
            }
        }

        return await query
            .OrderBy(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<int> CountPendingGradingRecordsAsync(Guid courseId, string? kind = null, CancellationToken ct = default)
    {
        var query = _db.GradeRecords.Where(g => g.CourseId == courseId && !g.IsFullyGraded);

        if (!string.IsNullOrWhiteSpace(kind))
        {
            if (kind.Equals("QUIZ_ATTEMPT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(g => g.RecordType == Domain.Enums.GradeRecordType.QuizAttempt);
            }
            else if (kind.Equals("ASSIGNMENT", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(g => g.RecordType == Domain.Enums.GradeRecordType.AssignmentSubmission);
            }
        }

        return await query.CountAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _db.SaveChangesAsync(ct);
    }
}
