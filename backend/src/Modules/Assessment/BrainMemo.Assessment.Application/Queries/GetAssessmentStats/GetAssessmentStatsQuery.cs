using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetAssessmentStats;

public sealed record GetAssessmentStatsQuery(Guid CourseId) : IQuery<AssessmentStatsDto>;

public sealed class GetAssessmentStatsQueryHandler(
    IAssessmentRepository repository,
    ICourseContract courseContract,
    IContentContract contentContract)
    : IQueryHandler<GetAssessmentStatsQuery, AssessmentStatsDto>
{
    public async Task<Result<AssessmentStatsDto>> Handle(GetAssessmentStatsQuery request, CancellationToken cancellationToken)
    {
        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var plos = await repository.GetPlosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var outcomeWeights = await repository.GetOutcomeWeightsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var allRecords = await repository.GetGradeRecordsForCourseAsync(request.CourseId, cancellationToken).ConfigureAwait(false);

        // Get enrolled students
        var learnersRes = courseContract.ListActiveLearnerIds(request.CourseId, null, 100);
        var learnerIds = (learnersRes.IsSuccess && learnersRes.Value.Items.Count > 0
            ? learnersRes.Value.Items.Concat(allRecords.Select(r => r.UserId))
            : allRecords.Select(r => r.UserId)).Distinct().ToList();

        // Assessable blocks & due dates
        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var assessableBlocks = assessableBlocksRes.IsSuccess ? assessableBlocksRes.Value : [];

        var dueDates = new Dictionary<Guid, DateTimeOffset?>();
        foreach (var comp in components)
        {
            if (comp.SourceKind == "ASSIGNMENT")
            {
                var assignDef = contentContract.GetAssignmentDefinition(comp.SourceBlockId);
                if (assignDef.IsSuccess)
                {
                    dueDates[comp.SourceBlockId] = assignDef.Value.DueAt;
                }
            }
        }

        var now = DateTimeOffset.UtcNow;
        var gradebooks = new List<GradebookResponseDto>();

        foreach (var uid in learnerIds)
        {
            var studentRecords = allRecords.Where(r => r.UserId == uid).ToList();
            var learner = new GradebookLearnerDto(uid, $"User {uid.ToString()[..6]}", null, null);

            var gb = GradebookCalculator.ComputeGradebook(
                config,
                components,
                assessableBlocks,
                studentRecords,
                dueDates,
                learner,
                now,
                clos,
                plos,
                outcomeWeights);

            gradebooks.Add(gb);
        }

        // 1. Score Distribution (0-2, 2-4, 4-6, 6-8, 8-10)
        int bucket0_2 = 0, bucket2_4 = 0, bucket4_6 = 0, bucket6_8 = 0, bucket8_10 = 0;
        foreach (var gb in gradebooks)
        {
            if (gb.TotalGrade.HasValue)
            {
                var score = gb.TotalGrade.Value;
                if (score < 2.0m) bucket0_2++;
                else if (score < 4.0m) bucket2_4++;
                else if (score < 6.0m) bucket4_6++;
                else if (score < 8.0m) bucket6_8++;
                else bucket8_10++;
            }
        }

        var scoreDistribution = new List<ScoreBucketDto>
        {
            new("0 - 2", bucket0_2),
            new("2 - 4", bucket2_4),
            new("4 - 6", bucket4_6),
            new("6 - 8", bucket6_8),
            new("8 - 10", bucket8_10),
        };

        // 2. CLO Pass Rates
        var cloPassRates = new List<CloPassRateDto>();
        if (clos.Count > 0 && gradebooks.Count > 0)
        {
            foreach (var clo in clos)
            {
                int achievedCount = gradebooks.Count(gb =>
                    gb.CloAchievements?.Any(ca => ca.CloId == clo.Id && ca.Achieved) ?? false);

                decimal passRate = Math.Round((decimal)achievedCount / gradebooks.Count * 100m, 1);
                cloPassRates.Add(new CloPassRateDto(clo.Id, clo.Code, passRate));
            }
        }

        // 3. Level Distribution
        var levelDict = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var gb in gradebooks)
        {
            var lvl = gb.Classification ?? "Chưa xếp loại";
            levelDict[lvl] = levelDict.GetValueOrDefault(lvl, 0) + 1;
        }

        var levelDistribution = levelDict
            .Select(kv => new LevelDistributionDto(kv.Key, kv.Value))
            .ToList();

        return Result.Success(new AssessmentStatsDto(
            ScoreDistribution: scoreDistribution,
            HardestQuestions: Array.Empty<HardestQuestionDto>(),
            CloPassRates: cloPassRates,
            LevelDistribution: levelDistribution));
    }
}
