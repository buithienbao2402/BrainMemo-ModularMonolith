using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Domain.Enums;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.ListGradingQueue;

public sealed class ListGradingQueueQueryHandler(IAssessmentRepository repository)
    : IQueryHandler<ListGradingQueueQuery, IReadOnlyList<GradingQueueItemDto>>
{
    public async Task<Result<IReadOnlyList<GradingQueueItemDto>>> Handle(ListGradingQueueQuery request, CancellationToken cancellationToken)
    {
        var records = await repository.GetPendingGradingRecordsAsync(
            request.CourseId,
            request.Kind,
            request.Page,
            request.PageSize,
            cancellationToken).ConfigureAwait(false);

        var items = new List<GradingQueueItemDto>();

        foreach (var r in records)
        {
            var component = await repository.GetComponentByIdAsync(r.ComponentId, cancellationToken).ConfigureAwait(false);
            string blockTitle = component?.Title ?? "Bài kiểm tra / Bài tập";
            Guid blockId = component?.SourceBlockId ?? Guid.Empty;

            string kind = r.RecordType == GradeRecordType.QuizAttempt ? "QUIZ_ATTEMPT" : "ASSIGNMENT";
            Guid sourceId = r.SourceAttemptId ?? r.SourceSubmissionId ?? r.Id;

            items.Add(new GradingQueueItemDto(
                Kind: kind,
                SourceId: sourceId,
                BlockId: blockId,
                BlockTitle: blockTitle,
                Learner: new GradingLearnerRefDto(r.UserId, $"Học viên {r.UserId.ToString()[..8]}", null),
                SubmittedAt: r.CreatedAt));
        }

        return Result.Success<IReadOnlyList<GradingQueueItemDto>>(items);
    }
}
