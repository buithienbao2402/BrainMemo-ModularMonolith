using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetComponentScores;

public sealed class GetComponentScoresQueryHandler(
    IAssessmentRepository repository,
    IIdentityContract identityContract)
    : IQueryHandler<GetComponentScoresQuery, IReadOnlyList<ComponentScoresDto>>
{
    public async Task<Result<IReadOnlyList<ComponentScoresDto>>> Handle(GetComponentScoresQuery request, CancellationToken cancellationToken)
    {
        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var comp = await repository.GetComponentByCourseAndBlockIdAsync(request.CourseId, request.BlockId, cancellationToken).ConfigureAwait(false);
        if (comp == null)
        {
            return Result.Success<IReadOnlyList<ComponentScoresDto>>(Array.Empty<ComponentScoresDto>());
        }

        var records = await repository.GetGradeRecordsForComponentAsync(request.CourseId, comp.Id, cancellationToken).ConfigureAwait(false);
        var rawRecords = records.Where(r => r.RecordType != GradeRecordType.ComponentFinal).ToList();

        var studentIds = rawRecords.Select(r => r.UserId).Distinct().ToList();
        var usersRes = await identityContract.GetUserSummary(studentIds, cancellationToken).ConfigureAwait(false);
        var userDict = usersRes.IsSuccess
            ? usersRes.Value.ToDictionary(u => u.Id)
            : new Dictionary<Guid, UserSummaryDto>();

        var list = new List<ComponentScoresDto>();

        foreach (var studentId in studentIds)
        {
            userDict.TryGetValue(studentId, out var userSummary);
            string displayName = !string.IsNullOrWhiteSpace(userSummary?.Email)
                ? userSummary.Email.Split('@')[0]
                : $"Học viên {studentId.ToString()[..8]}";

            var learner = new GradebookLearnerDto(
                studentId,
                displayName,
                userSummary?.Email,
                null);

            var studentAttempts = rawRecords
                .Where(r => r.UserId == studentId)
                .OrderBy(r => r.CreatedAt)
                .ToList();

            var fullyGraded = studentAttempts.Where(r => r.IsFullyGraded && r.Score.HasValue).ToList();

            decimal? highest = null;
            decimal? latest = null;
            decimal? average = null;
            decimal? final = null;

            if (fullyGraded.Count > 0)
            {
                highest = fullyGraded.Max(r => r.Score);
                latest = fullyGraded.OrderByDescending(r => r.GradedAt ?? r.CreatedAt).First().Score;
                average = Math.Round(fullyGraded.Average(r => r.Score!.Value), 2);

                final = config.ScoreSelectionRule.ToUpperInvariant() switch
                {
                    "LATEST" => latest,
                    "AVERAGE" => average,
                    _ => highest
                };
            }

            var attemptDtos = studentAttempts.Select(r => new ComponentAttemptScoreDto(
                AttemptId: r.SourceAttemptId ?? r.SourceSubmissionId ?? r.Id,
                Score: r.Score,
                MaxScore: r.MaxScore ?? comp.MaxScore,
                SubmittedAt: r.GradedAt ?? r.CreatedAt,
                IsFullyGraded: r.IsFullyGraded)).ToList();

            list.Add(new ComponentScoresDto(
                Learner: learner,
                Attempts: attemptDtos,
                Highest: highest,
                Latest: latest,
                Average: average,
                Final: final));
        }

        return Result.Success<IReadOnlyList<ComponentScoresDto>>(list);
    }
}
