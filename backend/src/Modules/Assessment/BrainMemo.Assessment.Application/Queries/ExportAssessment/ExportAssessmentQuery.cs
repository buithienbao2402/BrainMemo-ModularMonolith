using System.Text;
using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.ExportAssessment;

public sealed record ExportFileResult(byte[] Content, string ContentType, string FileName);

public sealed record ExportAssessmentQuery(
    Guid CourseId,
    string Format,
    string? Scope = null) : IQuery<ExportFileResult>;

public sealed class ExportAssessmentQueryHandler(
    IAssessmentRepository repository,
    ICourseContract courseContract,
    IContentContract contentContract,
    IIdentityContract identityContract)
    : IQueryHandler<ExportAssessmentQuery, ExportFileResult>
{
    public async Task<Result<ExportFileResult>> Handle(ExportAssessmentQuery request, CancellationToken cancellationToken)
    {
        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var plos = await repository.GetPlosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var outcomeWeights = await repository.GetOutcomeWeightsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var allRecords = await repository.GetGradeRecordsForCourseAsync(request.CourseId, cancellationToken).ConfigureAwait(false);

        var learnersRes = courseContract.ListActiveLearnerIds(request.CourseId, null, 100);
        var learnerIds = (learnersRes.IsSuccess && learnersRes.Value.Items.Count > 0
            ? learnersRes.Value.Items.Concat(allRecords.Select(r => r.UserId))
            : allRecords.Select(r => r.UserId)).Distinct().ToList();

        var usersRes = await identityContract.GetUserSummary(learnerIds, cancellationToken).ConfigureAwait(false);
        var userDict = usersRes.IsSuccess ? usersRes.Value.ToDictionary(u => u.Id) : new();

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
            userDict.TryGetValue(uid, out var userSummary);
            string displayName = !string.IsNullOrWhiteSpace(userSummary?.Email)
                ? userSummary.Email.Split('@')[0]
                : $"Học viên {uid.ToString()[..8]}";

            var learner = new GradebookLearnerDto(uid, displayName, userSummary?.Email, null);
            var studentRecords = allRecords.Where(r => r.UserId == uid).ToList();

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

        var sb = new StringBuilder();
        // UTF-8 BOM
        sb.Append('\uFEFF');

        string scope = request.Scope?.ToUpperInvariant() ?? "GRADEBOOK";
        string fileName = $"assessment_{scope.ToLowerInvariant()}_{request.CourseId}.csv";

        if (scope == "CLO")
        {
            // CLO report
            sb.AppendLine("ID Học viên,Họ và tên,Email," + string.Join(",", clos.Select(c => $"\"{c.Code} (%)\"")) + ",Đạt tất cả CLO");
            foreach (var gb in gradebooks)
            {
                var cloValues = clos.Select(c =>
                {
                    var ca = gb.CloAchievements?.FirstOrDefault(a => a.CloId == c.Id);
                    return ca != null ? $"{ca.Pct:F1}%" : "-";
                });

                sb.AppendLine($"{gb.Learner.Id},\"{gb.Learner.DisplayName}\",{gb.Learner.Email ?? ""},{string.Join(",", cloValues)},{(gb.AllCloAchieved ? "ĐẠT" : "CHƯA ĐẠT")}");
            }
        }
        else
        {
            // GRADEBOOK report
            var compHeaders = components.Select(c => $"\"{c.Title} ({c.CourseWeight}%)\"");
            sb.AppendLine("ID Học viên,Họ và tên,Email," + string.Join(",", compHeaders) + ",Điểm tổng kết (10),Xếp loại,Kết quả");

            foreach (var gb in gradebooks)
            {
                var compValues = components.Select(c =>
                {
                    var item = gb.Components.FirstOrDefault(i => i.BlockId == c.SourceBlockId);
                    return item?.Final != null ? $"{item.Final.Value:F1}" : "-";
                });

                var totalStr = gb.TotalGrade.HasValue ? $"{gb.TotalGrade.Value:F2}" : "-";
                var passStr = gb.AllCloAchieved ? "ĐẠT" : "CHƯA ĐẠT";

                sb.AppendLine($"{gb.Learner.Id},\"{gb.Learner.DisplayName}\",{gb.Learner.Email ?? ""},{string.Join(",", compValues)},{totalStr},{gb.Classification ?? "CHƯA XẾP LOẠI"},{passStr}");
            }
        }

        byte[] bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Result.Success(new ExportFileResult(bytes, "text/csv; charset=utf-8", fileName));
    }
}
