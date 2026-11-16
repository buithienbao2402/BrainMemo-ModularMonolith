using BrainMemo.Assessment.Application.Abstractions;
using BrainMemo.Assessment.Application.DTOs;
using BrainMemo.Assessment.Contracts;
using BrainMemo.Learning.Contracts;
using BrainMemo.Learning.Contracts.Dtos;
using BrainMemo.BuildingBlocks.Abstractions.Cqrs;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Assessment.Application.Commands.GradeAttemptManually;

public sealed class GradeAttemptManuallyCommandHandler(
    ILearningContract learningContract,
    IAssessmentContract assessmentContract,
    IAssessmentRepository repository)
    : ICommandHandler<GradeAttemptManuallyCommand, GradeAttemptManuallyResultDto>
{
    public async Task<Result<GradeAttemptManuallyResultDto>> Handle(GradeAttemptManuallyCommand request, CancellationToken cancellationToken)
    {
        var attemptForGrading = learningContract.GetQuizAttemptForGrading(request.AttemptId);
        if (!attemptForGrading.IsSuccess || attemptForGrading.Value == null)
        {
            return Result.Failure<GradeAttemptManuallyResultDto>(Error.NotFound("Không tìm thấy lượt thi."));
        }

        var attempt = attemptForGrading.Value;
        var manualGrades = new List<ManualGrade>();

        foreach (var g in request.Grades)
        {
            var q = attempt.Questions.FirstOrDefault(x => x.QuestionId == g.QuestionId);
            if (q == null)
            {
                return Result.Failure<GradeAttemptManuallyResultDto>(Error.Validation($"Câu hỏi {g.QuestionId} không thuộc bài thi này."));
            }

            if (g.Points < 0 || g.Points > q.MaxPoints)
            {
                return Result.Failure<GradeAttemptManuallyResultDto>(Error.Validation($"Điểm chấm cho câu hỏi {g.QuestionId} ({g.Points}) vượt quá điểm tối đa ({q.MaxPoints})."));
            }

            manualGrades.Add(new ManualGrade(g.QuestionId, g.Points, g.Feedback));
        }

        // DEC-03: Apply grades into Learning
        var applyResult = learningContract.ApplyManualQuestionGrades(
            request.AttemptId,
            manualGrades,
            request.GraderUserId,
            request.OverallFeedback);

        if (!applyResult.IsSuccess)
        {
            return Result.Failure<GradeAttemptManuallyResultDto>(applyResult.Error ?? new Error("MANUAL_GRADE_ERROR", "Lỗi khi cập nhật điểm câu hỏi."));
        }

        // Re-grade quiz attempt to compute final score and mark fully graded
        var gradeResult = assessmentContract.GradeQuizAttempt(request.AttemptId);
        if (!gradeResult.IsSuccess)
        {
            return Result.Failure<GradeAttemptManuallyResultDto>(gradeResult.Error ?? new Error("GRADE_QUIZ_ERROR", "Lỗi khi tổng kết điểm bài thi."));
        }

        var record = await repository.GetGradeRecordBySourceAttemptIdAsync(request.AttemptId, cancellationToken).ConfigureAwait(false);
        if (record != null)
        {
            record.UpdateScore(
                gradeResult.Value.TotalScore,
                gradeResult.Value.MaxScore,
                isFullyGraded: true,
                gradedAt: DateTimeOffset.UtcNow,
                feedback: request.OverallFeedback);

            await repository.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }

        return Result.Success(new GradeAttemptManuallyResultDto(
            TotalScore: gradeResult.Value.TotalScore,
            IsFullyGraded: true));
    }
}
