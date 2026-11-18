using System.Text.Json;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.Content.Contracts.Dtos;

namespace BrainMemo.Assessment.Application.Services;

public static class GradebookCalculator
{
    public static GradebookResponseDto ComputeGradebook(
        AssessmentConfig config,
        IReadOnlyList<AssessmentComponent> components,
        IReadOnlyList<AssessableBlockDto> assessableBlocks,
        IReadOnlyList<GradeRecord> studentRecords,
        IReadOnlyDictionary<Guid, DateTimeOffset?> dueDates,
        GradebookLearnerDto learner,
        DateTimeOffset now,
        IReadOnlyList<Clo>? clos = null,
        IReadOnlyList<Plo>? plos = null,
        IReadOnlyList<ComponentOutcomeWeight>? outcomeWeights = null)
    {
        var componentItems = new List<GradebookComponentItemDto>();
        decimal totalWeightedScore = 0m;
        decimal totalWeight = 0m;

        // Group student records by componentId
        var recordsByComponent = studentRecords
            .Where(r => r.RecordType != GradeRecordType.ComponentFinal)
            .GroupBy(r => r.ComponentId)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var comp in components)
        {
            recordsByComponent.TryGetValue(comp.Id, out var compRecords);
            compRecords ??= [];

            var fullyGraded = compRecords.Where(r => r.IsFullyGraded && r.Score.HasValue).ToList();
            var pendingManual = compRecords.Any(r => !r.IsFullyGraded);

            decimal? highest = null;
            decimal? latest = null;
            decimal? average = null;
            decimal? final = null;
            bool? isPassed = null;
            string status;
            string? feedback = null;

            if (fullyGraded.Count > 0)
            {
                highest = fullyGraded.Max(r => r.Score);
                var latestRecord = fullyGraded.OrderByDescending(r => r.GradedAt ?? r.CreatedAt).First();
                latest = latestRecord.Score;
                average = Math.Round(fullyGraded.Average(r => r.Score!.Value), 2);
                feedback = latestRecord.Feedback;

                final = config.ScoreSelectionRule.ToUpperInvariant() switch
                {
                    "LATEST" => latest,
                    "AVERAGE" => average,
                    _ => highest
                };

                status = "GRADED";
                if (final.HasValue && comp.MaxScore > 0)
                {
                    isPassed = (final.Value / comp.MaxScore * 100m) >= config.PassThreshold;
                }
            }
            else if (pendingManual)
            {
                status = "PENDING_MANUAL";
            }
            else
            {
                // Check past due
                dueDates.TryGetValue(comp.SourceBlockId, out var due);
                if (due.HasValue && now > due.Value)
                {
                    // Past due without submission = 0
                    highest = 0m;
                    latest = 0m;
                    average = 0m;
                    final = 0m;
                    status = "NOT_STARTED";
                    isPassed = false;
                }
                else
                {
                    status = due.HasValue ? "NOT_STARTED" : "NOT_DUE";
                }
            }

            if (final.HasValue && comp.CourseWeight > 0 && comp.MaxScore > 0)
            {
                decimal normalizedScore = (final.Value / comp.MaxScore) * 10.0m;
                totalWeightedScore += normalizedScore * comp.CourseWeight;
                totalWeight += comp.CourseWeight;
            }

            componentItems.Add(new GradebookComponentItemDto(
                BlockId: comp.SourceBlockId,
                Title: comp.Title,
                MaxScore: comp.MaxScore,
                CourseWeight: comp.CourseWeight,
                Final: final,
                Highest: highest,
                Latest: latest,
                Average: average,
                IsPassed: isPassed,
                Feedback: feedback,
                Status: status));
        }

        decimal? totalGrade = totalWeight > 0 ? Math.Round(totalWeightedScore / totalWeight, 2) : null;
        string? classification = ClassifyGrade(totalGrade, config.GradeScaleJson);

        // CLO Achievement calculation (§3.5.2)
        var cloAchievements = new List<CloAchievementDto>();
        decimal thresholdPct = config.PassThreshold <= 10m ? config.PassThreshold * 10m : config.PassThreshold;

        var outcomeWeightsByClo = (outcomeWeights ?? [])
            .GroupBy(w => w.CloId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var finalScoresByComponentId = new Dictionary<Guid, (decimal Score, decimal MaxScore, string Title, Guid BlockId)>();
        foreach (var comp in components)
        {
            var item = componentItems.FirstOrDefault(c => c.BlockId == comp.SourceBlockId);
            if (item?.Final != null && comp.MaxScore > 0)
            {
                finalScoresByComponentId[comp.Id] = (item.Final.Value, comp.MaxScore, comp.Title, comp.SourceBlockId);
            }
        }

        if (clos != null && clos.Count > 0)
        {
            foreach (var clo in clos)
            {
                outcomeWeightsByClo.TryGetValue(clo.Id, out var weights);
                weights ??= [];

                decimal sumWeightedRatio = 0m;
                decimal sumWeights = 0m;
                var contributions = new List<CloContributionDto>();

                foreach (var w in weights)
                {
                    if (finalScoresByComponentId.TryGetValue(w.ComponentId, out var compInfo))
                    {
                        decimal ratio = Math.Clamp(compInfo.Score / compInfo.MaxScore, 0m, 1m);
                        sumWeightedRatio += w.Weight * ratio;
                        sumWeights += w.Weight;
                        contributions.Add(new CloContributionDto(
                            BlockId: compInfo.BlockId,
                            Title: compInfo.Title,
                            Weight: w.Weight,
                            ScorePct: Math.Round(ratio * 100m, 2)));
                    }
                }

                decimal pct = sumWeights > 0m
                    ? Math.Round((sumWeightedRatio / sumWeights) * 100m, 2)
                    : 0m;

                bool achieved = pct >= thresholdPct;
                string level = DetermineAchievementLevel(pct, thresholdPct, config.AchievementLevelsJson);

                cloAchievements.Add(new CloAchievementDto(
                    CloId: clo.Id,
                    Code: clo.Code,
                    Pct: pct,
                    Level: level,
                    Achieved: achieved,
                    Contributions: contributions));
            }
        }

        // PLO Achievement calculation (FR-AST-12)
        var ploAchievements = new List<PloAchievementDto>();
        if (config.PloEnabled && plos != null && plos.Count > 0)
        {
            foreach (var plo in plos)
            {
                var linkedClos = (clos ?? [])
                    .Where(c => c.LinkedPloIds.Contains(plo.Id))
                    .Select(c => cloAchievements.FirstOrDefault(ca => ca.CloId == c.Id))
                    .Where(ca => ca != null)
                    .ToList();

                decimal ploPct = linkedClos.Count > 0
                    ? Math.Round(linkedClos.Average(ca => ca!.Pct), 2)
                    : 0m;

                bool ploAchieved = ploPct >= thresholdPct;

                ploAchievements.Add(new PloAchievementDto(
                    PloId: plo.Id,
                    Code: plo.Code,
                    Pct: ploPct,
                    Achieved: ploAchieved));
            }
        }

        bool allCloAchieved = cloAchievements.Count > 0
            ? cloAchievements.All(ca => ca.Achieved)
            : (totalGrade.HasValue && totalGrade.Value >= (config.PassThreshold <= 10m ? config.PassThreshold : config.PassThreshold / 10m));

        return new GradebookResponseDto(
            Learner: learner,
            Components: componentItems,
            TotalGrade: totalGrade,
            Classification: classification,
            CloAchievements: cloAchievements,
            PloAchievements: ploAchievements,
            AllCloAchieved: allCloAchieved);
    }

    public static string DetermineAchievementLevel(decimal pct, decimal passThreshold, string? achievementLevelsJson)
    {
        if (!string.IsNullOrWhiteSpace(achievementLevelsJson))
        {
            try
            {
                var levels = JsonSerializer.Deserialize<List<AchievementLevelDto>>(achievementLevelsJson);
                if (levels != null && levels.Count > 0)
                {
                    var match = levels.FirstOrDefault(l => pct >= l.MinPct && pct <= l.MaxPct);
                    if (match != null) return match.Label;
                }
            }
            catch { }
        }

        if (pct >= 85m) return "Xuất sắc";
        if (pct >= 70m) return "Tốt";
        if (pct >= passThreshold) return "Đạt";
        return "Chưa đạt";
    }

    public static string? ClassifyGrade(decimal? grade, string? gradeScaleJson)
    {
        if (!grade.HasValue) return null;

        if (!string.IsNullOrWhiteSpace(gradeScaleJson))
        {
            try
            {
                var scale = JsonSerializer.Deserialize<List<GradeScaleItemDto>>(gradeScaleJson);
                if (scale != null && scale.Count > 0)
                {
                    var match = scale.FirstOrDefault(s => grade.Value >= s.Min && grade.Value <= s.Max);
                    if (match != null) return match.Label;
                }
            }
            catch { }
        }

        // Default Vietnamese academic classification
        if (grade.Value >= 9.0m) return "Xuất sắc";
        if (grade.Value >= 8.0m) return "Giỏi";
        if (grade.Value >= 6.5m) return "Khá";
        if (grade.Value >= 5.0m) return "Trung bình";
        if (grade.Value >= 3.5m) return "Yếu";
        return "Kém";
    }
}
