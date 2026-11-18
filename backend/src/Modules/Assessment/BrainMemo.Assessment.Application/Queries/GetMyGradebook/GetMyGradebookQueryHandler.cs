using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Application.Services;
using BrainMemo.Assessment.Domain.Entities;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Identity.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetMyGradebook;

public sealed class GetMyGradebookQueryHandler(
    IAssessmentRepository repository,
    IContentContract contentContract,
    IIdentityContract identityContract)
    : IQueryHandler<GetMyGradebookQuery, GradebookResponseDto>
{
    public async Task<Result<GradebookResponseDto>> Handle(GetMyGradebookQuery request, CancellationToken cancellationToken)
    {
        var config = await repository.GetOrCreateConfigAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var components = await repository.GetComponentsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var studentRecords = await repository.GetGradeRecordsForStudentAsync(request.CourseId, request.UserId, cancellationToken).ConfigureAwait(false);

        var assessableBlocksRes = contentContract.GetAssessableBlocks(request.CourseId);
        var assessableBlocks = assessableBlocksRes.IsSuccess
            ? assessableBlocksRes.Value
            : Array.Empty<BrainMemo.Content.Contracts.Dtos.AssessableBlockDto>();

        // Lookup due dates
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

        // Learner info
        var usersRes = await identityContract.GetUserSummary(new[] { request.UserId }, cancellationToken).ConfigureAwait(false);
        var userSummary = usersRes.IsSuccess ? usersRes.Value.FirstOrDefault() : null;
        string displayName = !string.IsNullOrWhiteSpace(userSummary?.Email)
            ? userSummary.Email.Split('@')[0]
            : $"Học viên {request.UserId.ToString()[..8]}";

        var learner = new GradebookLearnerDto(
            request.UserId,
            displayName,
            userSummary?.Email,
            null);

        var clos = await repository.GetClosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var plos = await repository.GetPlosByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);
        var outcomeWeights = await repository.GetOutcomeWeightsByCourseIdAsync(request.CourseId, cancellationToken).ConfigureAwait(false);

        var now = DateTimeOffset.UtcNow;
        var gradebook = GradebookCalculator.ComputeGradebook(
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

        // Record COMPONENT_FINAL records for persistence
        foreach (var compItem in gradebook.Components)
        {
            if (compItem.Final.HasValue)
            {
                var comp = components.FirstOrDefault(c => c.SourceBlockId == compItem.BlockId);
                if (comp != null)
                {
                    var finalRecord = new GradeRecord(
                        id: Guid.NewGuid(),
                        userId: request.UserId,
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
