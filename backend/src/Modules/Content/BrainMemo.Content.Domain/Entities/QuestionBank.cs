using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class QuestionBank : Entity
{
    private QuestionBank() { }

    public QuestionBank(Guid id, Guid courseId, DifficultyScheme? difficultyScheme = null)
        : base(id)
    {
        CourseId = courseId;
        DifficultyScheme = difficultyScheme;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public Guid CourseId { get; private set; }
    public DifficultyScheme? DifficultyScheme { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public void SetDifficultyScheme(DifficultyScheme? scheme)
    {
        DifficultyScheme = scheme;
    }
}
