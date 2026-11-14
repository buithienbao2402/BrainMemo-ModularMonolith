namespace BrainMemo.Content.Domain.Entities;

public class QuizQuestion
{
    private QuizQuestion() { }

    public QuizQuestion(
        Guid quizBlockId,
        Guid questionId,
        int position,
        decimal points)
    {
        QuizBlockId = quizBlockId;
        QuestionId = questionId;
        Position = position;
        Points = points;
    }

    public Guid QuizBlockId { get; private set; }
    public Guid QuestionId { get; private set; }
    public int Position { get; private set; }
    public decimal Points { get; private set; }
}
