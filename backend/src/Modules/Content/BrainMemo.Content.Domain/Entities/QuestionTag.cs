namespace BrainMemo.Content.Domain.Entities;

public class QuestionTag
{
    private QuestionTag() { }

    public QuestionTag(Guid questionId, string tag)
    {
        QuestionId = questionId;
        Tag = tag.Trim();
    }

    public Guid QuestionId { get; private set; }
    public string Tag { get; private set; } = string.Empty;
}
