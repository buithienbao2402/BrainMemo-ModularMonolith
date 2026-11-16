using System.Text.Json;
using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Contracts;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetSubmissionForGrading;

public sealed class GetSubmissionForGradingQueryHandler(
    ILearningContract learningContract,
    IAssessmentRepository repository)
    : IQueryHandler<GetSubmissionForGradingQuery, GradingSubmissionDto>
{
    public async Task<Result<GradingSubmissionDto>> Handle(GetSubmissionForGradingQuery request, CancellationToken cancellationToken)
    {
        var subResult = learningContract.GetAssignmentSubmission(request.SubmissionId);
        if (!subResult.IsSuccess || subResult.Value == null)
        {
            return Result.Failure<GradingSubmissionDto>(Error.NotFound("Không tìm thấy bài nộp."));
        }

        var sub = subResult.Value;
        var gradeRecord = await repository.GetGradeRecordBySourceSubmissionIdAsync(request.SubmissionId, cancellationToken).ConfigureAwait(false);

        IReadOnlyList<GradingFileRefDto>? files = null;
        if (!string.IsNullOrWhiteSpace(sub.FilesJson))
        {
            try
            {
                files = JsonSerializer.Deserialize<List<GradingFileRefDto>>(sub.FilesJson);
            }
            catch
            {
                files = Array.Empty<GradingFileRefDto>();
            }
        }

        return Result.Success(new GradingSubmissionDto(
            Id: sub.SubmissionId,
            Status: sub.Status,
            TextContent: sub.TextContent,
            Files: files ?? Array.Empty<GradingFileRefDto>(),
            IsLate: sub.IsLate,
            SubmittedAt: sub.SubmittedAt,
            Score: gradeRecord?.Score,
            Feedback: gradeRecord?.Feedback));
    }
}
