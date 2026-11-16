using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Queries.GetAttemptForReview;

public sealed class GetAttemptForReviewQueryHandler(
    ILearningContract learningContract,
    IContentContract contentContract,
    IAssessmentRepository repository)
    : IQueryHandler<GetAttemptForReviewQuery, AttemptReviewDto>
{
    public async Task<Result<AttemptReviewDto>> Handle(GetAttemptForReviewQuery request, CancellationToken cancellationToken)
    {
        var attemptResult = learningContract.GetQuizAttemptForGrading(request.AttemptId);
        if (!attemptResult.IsSuccess || attemptResult.Value == null)
        {
            return Result.Failure<AttemptReviewDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        var attempt = attemptResult.Value;
        var gradeRecord = await repository.GetGradeRecordBySourceAttemptIdAsync(request.AttemptId, cancellationToken).ConfigureAwait(false);

        var questionIds = attempt.Questions.Select(q => q.QuestionId).ToList();
        var questionsContentResult = contentContract.GetQuestionsByIds(questionIds, includeAnswerKey: true);
        var contentDict = questionsContentResult.IsSuccess
            ? questionsContentResult.Value.ToDictionary(q => q.Id)
            : new Dictionary<Guid, BrainMemo.Content.Contracts.Dtos.QuestionDetailDto>();

        var reviewQuestions = new List<AttemptReviewQuestionDto>();

        foreach (var q in attempt.Questions)
        {
            contentDict.TryGetValue(q.QuestionId, out var detail);

            reviewQuestions.Add(new AttemptReviewQuestionDto(
                QuestionId: q.QuestionId,
                Position: q.Position,
                QuestionType: q.QuestionType,
                Stem: detail?.Stem ?? $"Câu hỏi {q.Position}",
                MaxPoints: q.MaxPoints,
                PointsEarned: q.PointsEarned,
                ReferenceAnswer: detail?.Explanation,
                StudentAnswerText: q.StudentAnswer?.TextAnswer,
                StudentSelectedOptionIds: q.StudentAnswer?.SelectedOptionIds,
                Feedback: q.GraderFeedback));
        }

        return Result.Success(new AttemptReviewDto(
            AttemptId: attempt.AttemptId,
            CourseId: attempt.CourseId,
            QuizBlockId: attempt.QuizBlockId,
            UserId: attempt.UserId,
            TotalScore: gradeRecord?.Score,
            MaxScore: attempt.Questions.Sum(q => q.MaxPoints),
            IsFullyGraded: gradeRecord?.IsFullyGraded ?? false,
            Questions: reviewQuestions));
    }
}
