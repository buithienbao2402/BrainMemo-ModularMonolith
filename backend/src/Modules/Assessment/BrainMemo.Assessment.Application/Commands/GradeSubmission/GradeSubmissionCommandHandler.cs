using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Learning.Contracts;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Commands.GradeSubmission;

public sealed class GradeSubmissionCommandHandler(
    IAssessmentRepository repository,
    ILearningContract learningContract)
    : ICommandHandler<GradeSubmissionCommand>
{
    public async Task<Result> Handle(GradeSubmissionCommand request, CancellationToken cancellationToken)
    {
        var record = await repository.GetGradeRecordBySourceSubmissionIdAsync(request.SubmissionId, cancellationToken).ConfigureAwait(false);
        if (record is null)
        {
            return Result.Failure(Error.NotFound("Không tìm thấy bản ghi chấm điểm cho bài nộp này."));
        }

        decimal maxScore = record.MaxScore ?? 10.0m;
        if (request.Score < 0 || request.Score > maxScore)
        {
            return Result.Failure(Error.Validation($"Điểm số ({request.Score}) vượt quá thang điểm tối đa ({maxScore})."));
        }

        DateTimeOffset now = DateTimeOffset.UtcNow;
        record.UpdateScore(request.Score, maxScore, isFullyGraded: true, gradedAt: now, feedback: request.Feedback);

        // Update Learning module
        learningContract.MarkAssignmentGraded(request.SubmissionId, now);

        await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }
}
