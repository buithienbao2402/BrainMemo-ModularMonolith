using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Domain;

namespace BrainMemo.Content.Domain.Entities;

public class QuizPrerequisite : Entity
{
    private QuizPrerequisite() { }

    public QuizPrerequisite(
        Guid id,
        Guid quizBlockId,
        QuizPrerequisiteKind targetKind,
        Guid targetId)
        : base(id)
    {
        QuizBlockId = quizBlockId;
        TargetKind = targetKind;
        TargetId = targetId;
    }

    public Guid QuizBlockId { get; private set; }
    public QuizPrerequisiteKind TargetKind { get; private set; }
    public Guid TargetId { get; private set; }
}
