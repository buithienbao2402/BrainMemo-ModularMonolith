using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Commands.StartQuizAttempt;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Queries.GetQuizAttempt;

public sealed class GetQuizAttemptQueryHandler : IQueryHandler<GetQuizAttemptQuery, QuizAttemptDto>
{
    private readonly ILearningRepository _learningRepository;
    private readonly IContentContract _contentContract;

    public GetQuizAttemptQueryHandler(
        ILearningRepository learningRepository,
        IContentContract contentContract)
    {
        _learningRepository = learningRepository;
        _contentContract = contentContract;
    }

    public async Task<Result<QuizAttemptDto>> Handle(GetQuizAttemptQuery request, CancellationToken cancellationToken)
    {
        var attempt = await _learningRepository.GetQuizAttemptByIdAsync(request.AttemptId, cancellationToken);
        if (attempt == null)
        {
            return Result.Failure<QuizAttemptDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        if (attempt.UserId != request.UserId)
        {
            return Result.Failure<QuizAttemptDto>(Error.Forbidden("Bạn không có quyền xem lượt thi này."));
        }

        var answers = await _learningRepository.GetQuizAttemptAnswersAsync(attempt.Id, cancellationToken);

        bool maskAnswers = true;
        if (attempt.Status != "IN_PROGRESS")
        {
            var quizDefRes = _contentContract.GetPublishedQuizDefinition(attempt.QuizBlockId);
            string resultDisplay = quizDefRes.IsSuccess ? quizDefRes.Value.ResultDisplay : "AFTER_SUBMIT";

            if (resultDisplay.Equals("AFTER_SUBMIT", StringComparison.OrdinalIgnoreCase) ||
                resultDisplay.Equals("AFTER_GRADING", StringComparison.OrdinalIgnoreCase) ||
                resultDisplay.Equals("AFTER_EACH_ANSWER", StringComparison.OrdinalIgnoreCase))
            {
                maskAnswers = false;
            }
        }

        List<QuestionSnapshotItem> snapshots = [];
        try
        {
            snapshots = JsonSerializer.Deserialize<List<QuestionSnapshotItem>>(attempt.QuestionSnapshot) ?? [];
        }
        catch { }

        var answerDict = answers.ToDictionary(a => a.QuestionId);
        var questions = new List<QuizQuestionDto>();

        foreach (var s in snapshots)
        {
            answerDict.TryGetValue(s.QuestionId, out var ans);
            QuizStudentAnswerDto? studentAnswerDto = null;
            if (ans != null && !string.IsNullOrWhiteSpace(ans.AnswerPayload))
            {
                try
                {
                    using var doc = JsonDocument.Parse(ans.AnswerPayload);
                    var root = doc.RootElement;
                    IReadOnlyList<Guid>? selectedIds = null;
                    if (root.TryGetProperty("SelectedOptionIds", out var selProp) && selProp.ValueKind == JsonValueKind.Array)
                    {
                        selectedIds = selProp.EnumerateArray().Select(e => e.GetGuid()).ToList();
                    }
                    string? textAns = root.TryGetProperty("TextAnswer", out var txtProp) ? txtProp.GetString() : null;

                    studentAnswerDto = new QuizStudentAnswerDto(
                        selectedIds,
                        textAns,
                        null,
                        maskAnswers ? null : ans.IsCorrect,
                        maskAnswers ? null : ans.PointsEarned,
                        ans.AnsweredAt);
                }
                catch { }
            }

            var options = s.Options.Select(o => new QuizOptionDto(
                o.Id,
                o.Position,
                o.Content,
                o.MatchContent,
                o.BlankNo,
                maskAnswers ? null : o.IsCorrect)).ToList();

            questions.Add(new QuizQuestionDto(
                s.QuestionId,
                s.Position,
                s.QuestionType,
                s.Stem,
                s.MaxPoints,
                s.AllowMultiple,
                options,
                maskAnswers ? null : s.Explanation,
                maskAnswers ? null : s.ReferenceAnswer,
                studentAnswerDto));
        }

        return Result.Success(new QuizAttemptDto(
            attempt.Id,
            attempt.QuizBlockId,
            attempt.CourseId,
            attempt.AttemptNo,
            attempt.Status,
            attempt.StartedAt,
            attempt.DeadlineAt,
            attempt.SubmittedAt,
            maskAnswers && attempt.Status == "IN_PROGRESS" ? null : attempt.TotalScore,
            attempt.MaxScore,
            questions));
    }
}
