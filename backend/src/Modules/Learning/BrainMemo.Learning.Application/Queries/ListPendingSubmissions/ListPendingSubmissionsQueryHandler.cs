using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ListPendingSubmissions;

public sealed class ListPendingSubmissionsQueryHandler(ILearningRepository learningRepository)
    : IQueryHandler<ListPendingSubmissionsQuery, IReadOnlyList<PendingSubmissionItemDto>>
{
    public async Task<Result<IReadOnlyList<PendingSubmissionItemDto>>> Handle(ListPendingSubmissionsQuery request, CancellationToken cancellationToken)
    {
        var subs = await learningRepository
            .ListPendingAssignmentSubmissionsAsync(request.CourseId, cancellationToken)
            .ConfigureAwait(false);

        var list = subs.Select(s => new PendingSubmissionItemDto(
            Id: s.Id,
            CourseId: s.CourseId,
            AssignmentBlockId: s.AssignmentBlockId,
            UserId: s.UserId,
            Status: s.Status,
            IsLate: s.IsLate,
            SubmittedAt: s.SubmittedAt)).ToList();

        return Result.Success<IReadOnlyList<PendingSubmissionItemDto>>(list);
    }
}
