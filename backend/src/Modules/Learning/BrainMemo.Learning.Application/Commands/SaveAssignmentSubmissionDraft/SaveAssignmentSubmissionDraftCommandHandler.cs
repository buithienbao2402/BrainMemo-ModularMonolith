using System.Text.Json;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.SaveAssignmentSubmissionDraft;

public sealed class SaveAssignmentSubmissionDraftCommandHandler(ILearningRepository learningRepository)
    : ICommandHandler<SaveAssignmentSubmissionDraftCommand, SubmissionDto>
{
    public async Task<Result<SubmissionDto>> Handle(SaveAssignmentSubmissionDraftCommand request, CancellationToken cancellationToken)
    {
        AssignmentSubmission? sub = await learningRepository
            .GetAssignmentSubmissionAsync(request.UserId, request.AssignmentBlockId, cancellationToken)
            .ConfigureAwait(false);

        if (sub != null && sub.Status != "DRAFT")
        {
            return Result.Failure<SubmissionDto>(new Error("ALREADY_SUBMITTED", "Bài tập đã được nộp, không thể chỉnh sửa."));
        }

        List<SubmissionFileRefDto> files = [];
        if (sub != null && !string.IsNullOrWhiteSpace(sub.FilesJson))
        {
            try
            {
                files = JsonSerializer.Deserialize<List<SubmissionFileRefDto>>(sub.FilesJson) ?? [];
            }
            catch { }
        }

        // Remove files
        if (request.Payload.RemoveFileKeys is { Count: > 0 })
        {
            files.RemoveAll(f => request.Payload.RemoveFileKeys.Contains(f.StorageKey));
        }

        // Add files
        if (request.Payload.FileUploadKeys is { Count: > 0 })
        {
            foreach (var key in request.Payload.FileUploadKeys)
            {
                if (!files.Any(f => f.StorageKey == key))
                {
                    files.Add(new SubmissionFileRefDto(
                        StorageKey: key,
                        OriginalFilename: System.IO.Path.GetFileName(key),
                        SizeBytes: 1024,
                        ContentType: "application/octet-stream"));
                }
            }
        }

        string filesJson = JsonSerializer.Serialize(files);

        if (sub is null)
        {
            sub = new AssignmentSubmission(
                id: Guid.NewGuid(),
                userId: request.UserId,
                courseId: request.CourseId,
                assignmentBlockId: request.AssignmentBlockId,
                textContent: request.Payload.TextContent,
                filesJson: filesJson);

            await learningRepository.AddAssignmentSubmissionAsync(sub, cancellationToken).ConfigureAwait(false);
        }
        else
        {
            sub.SaveDraft(request.Payload.TextContent, filesJson);
        }

        await learningRepository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

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
