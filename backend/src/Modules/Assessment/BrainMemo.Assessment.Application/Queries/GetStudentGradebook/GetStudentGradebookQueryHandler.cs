using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Course.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetStudentGradebook;

public sealed class GetStudentGradebookQueryHandler(
    IAssessmentRepository repository,
    IContentContract contentContract,
    ICourseContract courseContract,
    IIdentityContract identityContract)
    : IQueryHandler<GetStudentGradebookQuery, GradebookResponseDto>
{
    public async Task<Result<GradebookResponseDto>> Handle(GetStudentGradebookQuery request, CancellationToken cancellationToken)
    {
        var accessRes = courseContract.GetCourseAccess(request.CourseId, request.RequesterUserId);
        if (!accessRes.IsSuccess || !accessRes.Value.Exists)
        {
            return Result.Failure<GradebookResponseDto>(Error.NotFound("Không tìm thấy khóa học."));
        }

        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var studentRecords = await repository.GetGradeRecordsForStudentAsync(request.CourseId, request.StudentUserId, cancellationToken).ConfigureAwait(false);

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

        var usersRes = await identityContract.GetUserSummary(new[] { request.StudentUserId }, cancellationToken).ConfigureAwait(false);
        var userSummary = usersRes.IsSuccess ? usersRes.Value.FirstOrDefault() : null;
        string displayName = !string.IsNullOrWhiteSpace(userSummary?.Email)
            ? userSummary.Email.Split('@')[0]
            : $"Học viên {request.StudentUserId.ToString()[..8]}";

        var learner = new GradebookLearnerDto(
            request.StudentUserId,
            displayName,
            userSummary?.Email,
            null);

        var now = DateTimeOffset.UtcNow;
        var gradebook = GradebookCalculator.ComputeGradebook(
            config,
            components,
            assessableBlocks,
            studentRecords,
            dueDates,
            learner,
            now);

        // Upsert COMPONENT_FINAL
        foreach (var compItem in gradebook.Components)
        {
            if (compItem.Final.HasValue)
            {
                var comp = components.FirstOrDefault(c => c.SourceBlockId == compItem.BlockId);
                if (comp != null)
                {
                    var finalRecord = new GradeRecord(
                        id: Guid.NewGuid(),
                        userId: request.StudentUserId,
                        courseId: request.CourseId,
                        componentId: comp.Id,
                        recordType: GradeRecordType.ComponentFinal,
                        sourceAttemptId: null,
                        sourceSubmissionId: null,
                        score: compItem.Final,
                        maxScore: null,
                        isFullyGraded: true,
                        gradedAt: now,
                        feedback: compItem.Feedback);

                    await repository.UpsertGradeRecordAsync(finalRecord, cancellationToken).ConfigureAwait(false);
                }
            }
        }

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success(gradebook);
    }
}
