using System.Text.Json;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.Content.Contracts;
using BrainMemo.Learning.Application.Abstractions;
using BrainMemo.Learning.Application.DTOs;
using BrainMemo.Learning.Contracts.Events;
using BrainMemo.Learning.Domain.Entities;
using BrainMemo.SharedKernel.Results;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Learning.Application.Commands.StartQuizAttempt;

public sealed record QuestionSnapshotItem(
    Guid QuestionId,
    int Position,
    string QuestionType,
    bool AllowMultiple,
    decimal MaxPoints,
    string Stem,
    string? Explanation,
    string? ReferenceAnswer,
    IReadOnlyList<QuestionSnapshotOption> Options);

public sealed record QuestionSnapshotOption(
    Guid Id,
    int Position,
    string Content,
    string? MatchContent,
    int? BlankNo,
    bool IsCorrect);

public sealed class StartQuizAttemptCommandHandler : ICommandHandler<StartQuizAttemptCommand, QuizAttemptDto>
{
    private readonly ILearningRepository _learningRepository;
    private readonly IContentContract _contentContract;
    private readonly IOutboxWriter? _outboxWriter;
    private readonly ILogger<StartQuizAttemptCommandHandler> _logger;

    public StartQuizAttemptCommandHandler(
        ILearningRepository learningRepository,
        IContentContract contentContract,
        ILogger<StartQuizAttemptCommandHandler> logger,
        IOutboxWriter? outboxWriter = null)
    {
        _learningRepository = learningRepository;
        _contentContract = contentContract;
        _logger = logger;
        _outboxWriter = outboxWriter;
    }

    public async Task<Result<QuizAttemptDto>> Handle(StartQuizAttemptCommand request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        // 1. Check for existing active attempt (F5 recovery)
        var activeAttempt = await _learningRepository.GetActiveQuizAttemptAsync(request.UserId, request.QuizBlockId, cancellationToken);
        if (activeAttempt != null)
        {
            if (!activeAttempt.IsExpired(now))
            {
                return Result.Success(MapAttemptToDto(activeAttempt, await _learningRepository.GetQuizAttemptAnswersAsync(activeAttempt.Id, cancellationToken), maskAnswers: true));
            }
            else
            {
                // Auto-submit expired attempt
                activeAttempt.Submit(now, autoSubmitted: true);
                await _learningRepository.SaveChangesAsync(cancellationToken);
            }
        }

        // 2. Fetch quiz definition
        var quizDefResult = _contentContract.GetPublishedQuizDefinition(request.QuizBlockId);
        if (!quizDefResult.IsSuccess || quizDefResult.Value == null)
        {
            return Result.Failure<QuizAttemptDto>(quizDefResult.Error ?? Error.NotFound("Không tìm thấy bài trắc nghiệm."));
        }
        var quizDef = quizDefResult.Value;

        // 3. Password check
        if (quizDef.HasPassword)
        {
            var pwCheck = _contentContract.VerifyQuizPassword(request.QuizBlockId, request.Password ?? string.Empty);
            if (!pwCheck.IsSuccess)
            {
                return Result.Failure<QuizAttemptDto>(Error.Validation("Mật khẩu bài thi không chính xác."));
            }
        }

        // 4. Check student exceptions
        var exRes = _contentContract.GetQuizExceptions(request.QuizBlockId, request.UserId);
        var userException = exRes.IsSuccess ? exRes.Value : null;

        // 5. Check max attempts
        int allowedAttempts = (quizDef.MaxAttempts ?? 1) + (userException?.ExtraAttempts ?? 0);
        int currentAttemptsCount = await _learningRepository.CountQuizAttemptsAsync(request.UserId, request.QuizBlockId, cancellationToken);
        if (currentAttemptsCount >= allowedAttempts)
        {
            return Result.Failure<QuizAttemptDto>(Error.Conflict("Quiz.MaxAttemptsReached", "Đã đạt số lần thi tối đa."));
        }

        // 6. Draw questions
        var drawRes = _contentContract.DrawQuizQuestions(request.QuizBlockId);
        if (!drawRes.IsSuccess || drawRes.Value == null || drawRes.Value.QuestionIds.Count == 0)
        {
            return Result.Failure<QuizAttemptDto>(drawRes.Error ?? Error.Validation("Không có câu hỏi trong đề thi."));
        }

        var questionsRes = _contentContract.GetQuestionsByIds(drawRes.Value.QuestionIds, includeAnswerKey: true);
        if (!questionsRes.IsSuccess || questionsRes.Value == null || questionsRes.Value.Count == 0)
        {
            return Result.Failure<QuizAttemptDto>(questionsRes.Error ?? Error.Validation("Không thể tải chi tiết câu hỏi."));
        }

        var questionDetails = questionsRes.Value.ToList();

        // 7. Shuffle questions if configured
        if (quizDef.ShuffleQuestions)
        {
            var rng = new Random();
            questionDetails = questionDetails.OrderBy(_ => rng.Next()).ToList();
        }

        // 8. Calculate deadline
        int timeLimit = (quizDef.TimeLimitMinutes ?? 60) + (userException?.ExtraMinutes ?? 0);
        var deadline = now.AddMinutes(timeLimit);
        if (userException?.ExtendedCloseAt.HasValue == true && userException.ExtendedCloseAt.Value < deadline)
        {
            deadline = userException.ExtendedCloseAt.Value;
        }

        // 9. Snapshot questions
        var snapshotItems = new List<QuestionSnapshotItem>();
        var attemptAnswers = new List<QuizAttemptAnswer>();
        Guid attemptId = Guid.NewGuid();
        int position = 1;
        var rngOpt = new Random();

        foreach (var q in questionDetails)
        {
            var options = q.Options.ToList();
            if (quizDef.ShuffleOptions)
            {
                options = options.OrderBy(_ => rngOpt.Next()).ToList();
            }

            var snapshotOptions = options.Select((o, idx) => new QuestionSnapshotOption(
                o.Id,
                idx + 1,
                o.Content,
                o.MatchContent,
                o.BlankNo,
                o.IsCorrect ?? false)).ToList();

            bool allowMultiple = q.QuestionType.Equals("MULTIPLE_CHOICE", StringComparison.OrdinalIgnoreCase) &&
                                 snapshotOptions.Count(o => o.IsCorrect) > 1;

            var snapshotItem = new QuestionSnapshotItem(
                q.Id,
                position,
                q.QuestionType,
                allowMultiple,
                q.DefaultPoints,
                q.Stem,
                q.Explanation,
                q.ReferenceAnswer,
                snapshotOptions);

            snapshotItems.Add(snapshotItem);

            attemptAnswers.Add(new QuizAttemptAnswer(
                Guid.NewGuid(),
                attemptId,
                q.Id,
                position,
                q.DefaultPoints));

            position++;
        }

        decimal maxScore = snapshotItems.Sum(s => s.MaxPoints);
        string snapshotJson = JsonSerializer.Serialize(snapshotItems);

        var attempt = new QuizAttempt(
            attemptId,
            request.UserId,
            request.CourseId,
            request.QuizBlockId,
            currentAttemptsCount + 1,
            deadline,
            maxScore,
            snapshotJson,
            now);

        await _learningRepository.AddQuizAttemptWithAnswersAsync(attempt, attemptAnswers, cancellationToken);
        await _learningRepository.SaveChangesAsync(cancellationToken);

        if (_outboxWriter != null)
        {
            try
            {
                await _outboxWriter.WriteAsync(attempt.Id, new QuizAttemptStarted(
                    Guid.NewGuid(),
                    now,
                    attempt.Id,
                    attempt.UserId,
                    attempt.QuizBlockId,
                    attempt.DeadlineAt));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to write QuizAttemptStarted to outbox");
            }
        }

        return Result.Success(MapAttemptToDto(attempt, attemptAnswers, maskAnswers: true));
    }

    private static QuizAttemptDto MapAttemptToDto(QuizAttempt attempt, IReadOnlyList<QuizAttemptAnswer> answers, bool maskAnswers)
    {
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

        return new QuizAttemptDto(
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
            questions);
    }
}
