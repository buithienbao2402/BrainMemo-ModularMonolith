using System.Text.Json;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetMyAssignmentSubmission;

public sealed class GetMyAssignmentSubmissionQueryHandler(ILearningRepository learningRepository)
    : IQueryHandler<GetMyAssignmentSubmissionQuery, SubmissionDto>
{
    public async Task<Result<SubmissionDto>> Handle(GetMyAssignmentSubmissionQuery request, CancellationToken cancellationToken)
    {
        AssignmentSubmission? sub = await learningRepository
            .GetAssignmentSubmissionAsync(request.UserId, request.AssignmentBlockId, cancellationToken)
            .ConfigureAwait(false);

        if (sub is null)
        {
            return Result.Success(new SubmissionDto(
                Id: Guid.Empty,
                Status: "DRAFT",
                TextContent: null,
                Files: Array.Empty<SubmissionFileRefDto>(),
                IsLate: null,
                SubmittedAt: null,
                Score: null,
                Feedback: null));
        }

        IReadOnlyList<SubmissionFileRefDto>? files = null;
        if (!string.IsNullOrWhiteSpace(sub.FilesJson))
        {
            try
            {
                files = JsonSerializer.Deserialize<List<SubmissionFileRefDto>>(sub.FilesJson);
            }
            catch
            {
                files = Array.Empty<SubmissionFileRefDto>();
            }
        }

        return Result.Success(new SubmissionDto(
            Id: sub.Id,
            Status: sub.Status,
            TextContent: sub.TextContent,
            Files: files ?? Array.Empty<SubmissionFileRefDto>(),
            IsLate: sub.IsLate,
            SubmittedAt: sub.SubmittedAt,
            Score: null,
            Feedback: null));
    }
}
