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

    public async Task<IReadOnlyList<AssessmentComponent>> GetComponentsByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.AssessmentComponents
            .Where(c => c.CourseId == courseId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);
    }

    public Task DeleteComponentAsync(AssessmentComponent component, CancellationToken ct = default)
    {
        _db.AssessmentComponents.Remove(component);
        return Task.CompletedTask;
    }

    public async Task<bool> HasGradeRecordsForComponentAsync(Guid componentId, CancellationToken ct = default)
    {
        return await _db.GradeRecords.AnyAsync(g => g.ComponentId == componentId, ct);
    }

    public async Task<AssessmentConfig?> GetConfigByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.AssessmentConfigs
            .FirstOrDefaultAsync(c => c.CourseId == courseId, ct);
    }

    public async Task<AssessmentConfig> GetOrCreateConfigAsync(Guid courseId, CancellationToken ct = default)
    {
        var existing = await GetConfigByCourseIdAsync(courseId, ct);
        if (existing != null)
        {
            return existing;
        }

        var config = new AssessmentConfig(
            id: Guid.NewGuid(),
            courseId: courseId,
            passThreshold: 50.0m,
            scoreSelectionRule: "HIGHEST",
            gradeScaleJson: null,
            achievementLevelsJson: null,
            bloomScaleJson: null,
            ploEnabled: false);

        await _db.AssessmentConfigs.AddAsync(config, ct);
        return config;
    }

    public async Task AddConfigAsync(AssessmentConfig config, CancellationToken ct = default)
    {
        await _db.AssessmentConfigs.AddAsync(config, ct);
    }

    public async Task UpsertGradeRecordAsync(GradeRecord record, CancellationToken ct = default)
    {
        var existing = await _db.GradeRecords.FirstOrDefaultAsync(g => g.Id == record.Id, ct);
        if (existing == null && record.SourceAttemptId.HasValue)
        {
            existing = await _db.GradeRecords.FirstOrDefaultAsync(g => g.SourceAttemptId == record.SourceAttemptId, ct);
        }

        if (existing == null && record.SourceSubmissionId.HasValue)
        {
            existing = await _db.GradeRecords.FirstOrDefaultAsync(g => g.SourceSubmissionId == record.SourceSubmissionId, ct);
        }

        if (existing == null && record.RecordType == Domain.Enums.GradeRecordType.ComponentFinal)
        {
            existing = await _db.GradeRecords.FirstOrDefaultAsync(g =>
                g.CourseId == record.CourseId &&
                g.UserId == record.UserId &&
                g.ComponentId == record.ComponentId &&
                g.RecordType == Domain.Enums.GradeRecordType.ComponentFinal, ct);
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

    public async Task<IReadOnlyList<GradeRecord>> GetGradeRecordsForComponentAsync(Guid courseId, Guid componentId, CancellationToken ct = default)
    {
        return await _db.GradeRecords
            .Where(g => g.CourseId == courseId && g.ComponentId == componentId)
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
