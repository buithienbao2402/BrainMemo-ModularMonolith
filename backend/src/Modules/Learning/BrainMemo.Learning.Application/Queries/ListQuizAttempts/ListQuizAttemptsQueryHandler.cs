using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.ListQuizAttempts;

public sealed class ListQuizAttemptsQueryHandler : IQueryHandler<ListQuizAttemptsQuery, IReadOnlyList<QuizAttemptSummaryDto>>
{
    private readonly ILearningRepository _learningRepository;

    public ListQuizAttemptsQueryHandler(ILearningRepository learningRepository)
    {
        _learningRepository = learningRepository;
    }

    public async Task<Result<IReadOnlyList<QuizAttemptSummaryDto>>> Handle(ListQuizAttemptsQuery request, CancellationToken cancellationToken)
    {
        var attempts = await _learningRepository.ListQuizAttemptsAsync(request.UserId, request.QuizBlockId, cancellationToken);

        var list = attempts.Select(a => new QuizAttemptSummaryDto(
            a.Id,
            a.QuizBlockId,
            a.UserId,
            a.Status,
            a.TotalScore.HasValue ? (double)a.TotalScore.Value : null,
            (double)a.MaxScore,
            a.StartedAt,
            a.SubmittedAt)).ToList();

        return Result.Success<IReadOnlyList<QuizAttemptSummaryDto>>(list);
    }
}
