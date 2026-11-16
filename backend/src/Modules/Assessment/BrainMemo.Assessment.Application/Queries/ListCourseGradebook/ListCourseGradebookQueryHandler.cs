using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.ListCourseGradebook;

public sealed class ListCourseGradebookQueryHandler(
    IAssessmentRepository repository,
    IContentContract contentContract,
    ICourseContract courseContract,
    IIdentityContract identityContract)
    : IQueryHandler<ListCourseGradebookQuery, IReadOnlyList<GradebookResponseDto>>
{
    public async Task<Result<IReadOnlyList<GradebookResponseDto>>> Handle(ListCourseGradebookQuery request, CancellationToken cancellationToken)
    {
        var accessRes = courseContract.GetCourseAccess(request.CourseId, request.RequesterUserId);
        if (!accessRes.IsSuccess || !accessRes.Value.Exists)
        {
            return Result.Failure<IReadOnlyList<GradebookResponseDto>>(Error.NotFound("Không tìm thấy khóa học."));
        }

        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var allCourseRecords = await repository.GetGradeRecordsForCourseAsync(request.CourseId, cancellationToken).ConfigureAwait(false);

        // Find all student user IDs
        var studentUserIds = allCourseRecords.Select(r => r.UserId).Distinct().ToList();

        // Also check enrolled learners if few records
        var activeLearnersRes = courseContract.ListActiveLearnerIds(request.CourseId, null, 100);
        if (activeLearnersRes.IsSuccess && activeLearnersRes.Value.Items.Count > 0)
        {
            foreach (var uid in activeLearnersRes.Value.Items)
            {
                if (!studentUserIds.Contains(uid))
                {
                    studentUserIds.Add(uid);
                }
            }
        }

        // Pagination
        var pagedUserIds = studentUserIds
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToList();

        var usersRes = await identityContract.GetUserSummary(pagedUserIds, cancellationToken).ConfigureAwait(false);
        var userDict = usersRes.IsSuccess
            ? usersRes.Value.ToDictionary(u => u.Id)
            : new Dictionary<Guid, BrainMemo.Identity.Contracts.UserSummaryDto>();

        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var assessableBlocks = assessableBlocksRes.IsSuccess
            ? assessableBlocksRes.Value
            : Array.Empty<BrainMemo.Content.Contracts.Dtos.AssessableBlockDto>();

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
        var resultList = new List<GradebookResponseDto>();

        foreach (var uid in pagedUserIds)
        {
            userDict.TryGetValue(uid, out var userSummary);
            string displayName = !string.IsNullOrWhiteSpace(userSummary?.Email)
                ? userSummary.Email.Split('@')[0]
                : $"Học viên {uid.ToString()[..8]}";

            var learner = new GradebookLearnerDto(
                uid,
                displayName,
                userSummary?.Email,
                null);

            var studentRecords = allCourseRecords.Where(r => r.UserId == uid).ToList();
            var gb = GradebookCalculator.ComputeGradebook(
                config,
                components,
                assessableBlocks,
                studentRecords,
                dueDates,
                learner,
                now);

            resultList.Add(gb);
        }

        return Result.Success<IReadOnlyList<GradebookResponseDto>>(resultList);
    }
}
