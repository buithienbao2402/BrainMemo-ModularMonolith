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

    public async Task<IReadOnlyList<Clo>> GetClosByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.Clos
            .Where(c => c.CourseId == courseId)
            .OrderBy(c => c.Code)
            .ToListAsync(ct);
    }

    public async Task<Clo?> GetCloByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Clos.FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<Clo?> GetCloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default)
    {
        return await _db.Clos
            .FirstOrDefaultAsync(c => c.CourseId == courseId && c.Code == code, ct);
    }

    public async Task AddCloAsync(Clo clo, CancellationToken ct = default)
    {
        await _db.Clos.AddAsync(clo, ct);
    }

    public Task DeleteCloAsync(Clo clo, CancellationToken ct = default)
    {
        _db.Clos.Remove(clo);
        return Task.CompletedTask;
    }

    public async Task<bool> HasOutcomeWeightsForCloAsync(Guid cloId, CancellationToken ct = default)
    {
        return await _db.ComponentOutcomeWeights.AnyAsync(w => w.CloId == cloId, ct);
    }

    public async Task<IReadOnlyList<Plo>> GetPlosByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.Plos
            .Where(p => p.CourseId == courseId)
            .OrderBy(p => p.Code)
            .ToListAsync(ct);
    }

    public async Task<Plo?> GetPloByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Plos.FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task<Plo?> GetPloByCourseAndCodeAsync(Guid courseId, string code, CancellationToken ct = default)
    {
        return await _db.Plos
            .FirstOrDefaultAsync(p => p.CourseId == courseId && p.Code == code, ct);
    }

    public async Task AddPloAsync(Plo plo, CancellationToken ct = default)
    {
        await _db.Plos.AddAsync(plo, ct);
    }

    public Task DeletePloAsync(Plo plo, CancellationToken ct = default)
    {
        _db.Plos.Remove(plo);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        var componentIds = await _db.AssessmentComponents
            .Where(c => c.CourseId == courseId)
            .Select(c => c.Id)
            .ToListAsync(ct);

        return await _db.ComponentOutcomeWeights
            .Where(w => componentIds.Contains(w.ComponentId))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ComponentOutcomeWeight>> GetOutcomeWeightsByComponentIdAsync(Guid componentId, CancellationToken ct = default)
    {
        return await _db.ComponentOutcomeWeights
            .Where(w => w.ComponentId == componentId)
            .ToListAsync(ct);
    }

    public async Task ReplaceComponentOutcomeWeightsAsync(
        Guid componentId,
        IEnumerable<ComponentOutcomeWeight> weights,
        CancellationToken ct = default)
    {
        var existing = await _db.ComponentOutcomeWeights
            .Where(w => w.ComponentId == componentId)
            .ToListAsync(ct);

        if (existing.Count > 0)
        {
            _db.ComponentOutcomeWeights.RemoveRange(existing);
        }

        await _db.ComponentOutcomeWeights.AddRangeAsync(weights, ct);
    }

    public async Task<CourseReview?> GetReviewByCourseAndUserAsync(Guid courseId, Guid userId, CancellationToken ct = default)
    {
        return await _db.CourseReviews.FirstOrDefaultAsync(r => r.CourseId == courseId && r.UserId == userId, ct);
    }

    public async Task<CourseReview?> GetReviewByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.CourseReviews.FirstOrDefaultAsync(r => r.Id == id, ct);
    }

    public async Task<IReadOnlyList<CourseReview>> GetReviewsByCourseIdAsync(Guid courseId, int page, int pageSize, CancellationToken ct = default)
    {
        return await _db.CourseReviews
            .Where(r => r.CourseId == courseId)
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
    }

    public async Task<int> CountReviewsByCourseIdAsync(Guid courseId, CancellationToken ct = default)
    {
        return await _db.CourseReviews
            .CountAsync(r => r.CourseId == courseId, ct);
    }

    public async Task<(decimal? AvgRating, int TotalCount, Dictionary<int, int> Distribution)> GetCourseReviewStatsAsync(Guid courseId, CancellationToken ct = default)
    {
        var ratings = await _db.CourseReviews
            .Where(r => r.CourseId == courseId)
            .Select(r => r.Rating)
            .ToListAsync(ct);

        var dist = new Dictionary<int, int> { [1] = 0, [2] = 0, [3] = 0, [4] = 0, [5] = 0 };
        if (ratings.Count == 0)
        {
            return (null, 0, dist);
        }

        foreach (var r in ratings)
        {
            if (dist.ContainsKey(r)) dist[r]++;
        }

        var avg = Math.Round((decimal)ratings.Average(), 2);
        return (avg, ratings.Count, dist);
    }

    public async Task AddReviewAsync(CourseReview review, CancellationToken ct = default)
    {
        await _db.CourseReviews.AddAsync(review, ct);
    }

    public Task DeleteReviewAsync(CourseReview review, CancellationToken ct = default)
    {
        _db.CourseReviews.Remove(review);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _db.SaveChangesAsync(ct);
    }
}
