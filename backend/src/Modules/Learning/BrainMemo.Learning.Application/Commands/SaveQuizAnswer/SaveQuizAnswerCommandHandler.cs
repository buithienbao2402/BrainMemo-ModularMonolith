using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.Commands.StartQuizAttempt;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Learning.Application.Commands.SaveQuizAnswer;

public sealed class SaveQuizAnswerCommandHandler : ICommandHandler<SaveQuizAnswerCommand, SaveAnswerResultDto>
{
    private readonly ILearningRepository _learningRepository;
    private readonly IContentContract _contentContract;

    public SaveQuizAnswerCommandHandler(
        ILearningRepository learningRepository,
        IContentContract contentContract)
    {
        _learningRepository = learningRepository;
        _contentContract = contentContract;
    }

    public async Task<Result<SaveAnswerResultDto>> Handle(SaveQuizAnswerCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var attempt = await _learningRepository.GetQuizAttemptByIdAsync(request.AttemptId, cancellationToken);
        if (attempt == null)
        {
            return Result.Failure<SaveAnswerResultDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        if (attempt.UserId != request.UserId)
        {
            return Result.Failure<SaveAnswerResultDto>(Error.Forbidden("Bạn không có quyền thực hiện thao tác này."));
        }

        if (attempt.Status != "IN_PROGRESS")
        {
            return Result.Failure<SaveAnswerResultDto>(Error.Conflict("Attempt.NotActive", "Lượt thi đã kết thúc."));
        }

        if (attempt.IsExpired(now))
        {
            attempt.Submit(now, autoSubmitted: true);
            await _learningRepository.SaveChangesAsync(cancellationToken);
            return Result.Failure<SaveAnswerResultDto>(Error.Validation("Hết thời gian làm bài thi."));
        }

        var answer = await _learningRepository.GetQuizAttemptAnswerAsync(request.AttemptId, request.QuestionId, cancellationToken);
        if (answer == null)
        {
            return Result.Failure<SaveAnswerResultDto>(Error.NotFound("Câu hỏi không thuộc đề thi này."));
        }

        string payloadJson = JsonSerializer.Serialize(request.Payload);
        answer.SaveAnswer(payloadJson, now);

        bool? isCorrect = null;
        decimal? pointsEarned = null;

        var quizDefRes = _contentContract.GetPublishedQuizDefinition(attempt.QuizBlockId);
        if (quizDefRes.IsSuccess && quizDefRes.Value.ResultDisplay.Equals("AFTER_EACH_ANSWER", StringComparison.OrdinalIgnoreCase))
        {
            // Immediate evaluation for AFTER_EACH_ANSWER
            try
            {
                var snapshots = JsonSerializer.Deserialize<List<QuestionSnapshotItem>>(attempt.QuestionSnapshot);
                var snap = snapshots?.FirstOrDefault(s => s.QuestionId == request.QuestionId);
                if (snap != null)
                {
                    var correctIds = snap.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToHashSet();
                    var selected = request.Payload.SelectedOptionIds?.ToHashSet() ?? [];
                    if (snap.AllowMultiple)
                    {
                        isCorrect = selected.Count > 0 && selected.SetEquals(correctIds);
                    }
                    else
                    {
                        isCorrect = selected.Count == 1 && correctIds.Contains(selected.First());
                    }
                    pointsEarned = isCorrect == true ? snap.MaxPoints : 0m;
                    answer.SetGrade(pointsEarned.Value, isCorrect.Value, now);
                }
            }
            catch { }
        }

        await _learningRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(new SaveAnswerResultDto(now, isCorrect, pointsEarned));
    }
}
