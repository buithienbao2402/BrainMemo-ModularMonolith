using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class QuizRandomRule : Entity
{
    private QuizRandomRule() { }

    public QuizRandomRule(
        Guid id,
        Guid quizBlockId,
        ushort position,
        ushort pickCount,
        decimal pointsEach,
        string? filterTag = null,
        byte? filterDifficultyCode = null,
        QuestionType? filterQuestionType = null)
        : base(id)
    {
        QuizBlockId = quizBlockId;
        Position = position;
        PickCount = pickCount;
        PointsEach = pointsEach;
        FilterTag = filterTag;
        FilterDifficultyCode = filterDifficultyCode;
        FilterQuestionType = filterQuestionType;
    }

    public Guid QuizBlockId { get; private set; }
    public ushort Position { get; private set; }
    public ushort PickCount { get; private set; }
    public decimal PointsEach { get; private set; }
    public string? FilterTag { get; private set; }
    public byte? FilterDifficultyCode { get; private set; }
    public QuestionType? FilterQuestionType { get; private set; }
}
