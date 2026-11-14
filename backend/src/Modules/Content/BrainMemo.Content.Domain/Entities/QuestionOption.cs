using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class QuestionOption : Entity
{
    private QuestionOption() { }

    public QuestionOption(
        Guid id,
        Guid questionId,
        ushort position,
        string content,
        string? matchContent = null,
        byte? blankNo = null,
        bool isCorrect = false)
        : base(id)
    {
        QuestionId = questionId;
        Position = position;
        Content = content;
        MatchContent = matchContent;
        BlankNo = blankNo;
        IsCorrect = isCorrect;
    }

    public Guid QuestionId { get; private set; }
    public ushort Position { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string? MatchContent { get; private set; }
    public byte? BlankNo { get; private set; }
    public bool IsCorrect { get; private set; }
}
