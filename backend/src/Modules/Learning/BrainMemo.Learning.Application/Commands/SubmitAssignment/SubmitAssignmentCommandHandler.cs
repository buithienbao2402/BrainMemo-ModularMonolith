using System.Text.Json;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.Learning.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.SubmitAssignment;

public sealed class SubmitAssignmentCommandHandler(
    ILearningRepository learningRepository,
    IContentContract contentContract,
    IAssessmentContract assessmentContract)
    : ICommandHandler<SubmitAssignmentCommand, SubmissionDto>
{
    public async Task<Result<SubmissionDto>> Handle(SubmitAssignmentCommand request, CancellationToken cancellationToken)
    {
        AssignmentSubmission? sub = await learningRepository
            .GetAssignmentSubmissionAsync(request.UserId, request.AssignmentBlockId, cancellationToken)
            .ConfigureAwait(false);

        if (sub != null && sub.Status != "DRAFT")
        {
            return Result.Failure<SubmissionDto>(new Error("ALREADY_SUBMITTED", "Bài tập đã được nộp trước đó. Không thể nộp lại."));
        }

        var assignmentDefResult = contentContract.GetAssignmentDefinition(request.AssignmentBlockId);
        DateTimeOffset now = DateTimeOffset.UtcNow;
        bool isLate = false;

        if (assignmentDefResult.IsSuccess && assignmentDefResult.Value.DueAt.HasValue)
        {
            isLate = now > assignmentDefResult.Value.DueAt.Value;
        }

        if (sub is null)
        {
            sub = new AssignmentSubmission(
                id: Guid.NewGuid(),
                userId: request.UserId,
                courseId: request.CourseId,
                assignmentBlockId: request.AssignmentBlockId,
                textContent: null,
                filesJson: "[]");

            await learningRepository.AddAssignmentSubmissionAsync(sub, cancellationToken).ConfigureAwait(false);
        }

        sub.Submit(isLate, now);

        // Mark block completed
        var existingCompletion = await learningRepository
            .GetBlockCompletionAsync(request.UserId, request.AssignmentBlockId, cancellationToken)
            .ConfigureAwait(false);

        if (existingCompletion is null)
        {
            var completion = new BlockCompletion(
                id: Guid.NewGuid(),
                userId: request.UserId,
                courseId: request.CourseId,
                chapterId: Guid.Empty,
                blockId: request.AssignmentBlockId,
                blockType: LearningBlockType.Assignment,
                completedAt: now);

            await learningRepository.AddBlockCompletionAsync(completion, cancellationToken).ConfigureAwait(false);
        }

        await learningRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Notify Assessment module to register grade record
        assessmentContract.RecordAssignmentSubmission(
            sub.Id,
            request.CourseId,
            request.UserId,
            request.AssignmentBlockId,
            now);

        IReadOnlyList<SubmissionFileRefDto> files = [];
        if (!string.IsNullOrWhiteSpace(sub.FilesJson))
        {
            try
            {
                files = JsonSerializer.Deserialize<List<SubmissionFileRefDto>>(sub.FilesJson) ?? [];
            }
            catch { }
        }

        return Result.Success(new SubmissionDto(
            Id: sub.Id,
            Status: sub.Status,
            TextContent: sub.TextContent,
            Files: files,
            IsLate: sub.IsLate,
            SubmittedAt: sub.SubmittedAt,
            Score: null,
            Feedback: null));
    }
}
