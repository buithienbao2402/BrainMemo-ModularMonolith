using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Domain.Entities;

public class Question : AggregateRoot
{
    private Question() { }

    public Question(
        Guid id,
        Guid bankId,
        QuestionType questionType,
        bool allowMultiple,
        string stem,
        string? explanation,
        string? referenceAnswer,
        byte? difficultyCode,
        decimal defaultPoints,
        QuestionStatus status = QuestionStatus.Draft,
        QuestionOrigin origin = QuestionOrigin.Manual,
        Guid? aiJobId = null,
        ushort? aiItemNo = null)
        : base(id)
    {
        BankId = bankId;
        QuestionType = questionType;
        AllowMultiple = allowMultiple;
        Stem = stem;
        Explanation = explanation;
        ReferenceAnswer = referenceAnswer;
        DifficultyCode = difficultyCode;
        DefaultPoints = defaultPoints;
        Status = status;
        Origin = origin;
        AiJobId = aiJobId;
        AiItemNo = aiItemNo;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public Guid BankId { get; private set; }
    public QuestionType QuestionType { get; private set; }
    public bool AllowMultiple { get; private set; }
    public string Stem { get; private set; } = string.Empty;
    public string? Explanation { get; private set; }
    public string? ReferenceAnswer { get; private set; }
    public byte? DifficultyCode { get; private set; }
    public decimal DefaultPoints { get; private set; }
    public QuestionStatus Status { get; private set; }
    public QuestionOrigin Origin { get; private set; }
    public Guid? AiJobId { get; private set; }
    public ushort? AiItemNo { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        string stem,
        string? explanation,
        string? referenceAnswer,
        byte? difficultyCode,
        decimal defaultPoints,
        bool allowMultiple)
    {
        Stem = stem;
        Explanation = explanation;
        ReferenceAnswer = referenceAnswer;
        DifficultyCode = difficultyCode;
        DefaultPoints = defaultPoints;
        AllowMultiple = allowMultiple;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public Result SetStatus(QuestionStatus newStatus)
    {
        Status = newStatus;
        UpdatedAt = DateTimeOffset.UtcNow;
        return Result.Success();
    }
}
