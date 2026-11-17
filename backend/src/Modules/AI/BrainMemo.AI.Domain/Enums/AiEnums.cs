namespace BrainMemo.AI.Domain.Enums;

public enum AiJobType
{
    Quiz,
    Flashcard
}

public enum AiSourceKind
{
    PastedText,
    Chapter
}

public enum AiJobStatus
{
    Pending,
    Running,
    Completed,
    Failed
}
