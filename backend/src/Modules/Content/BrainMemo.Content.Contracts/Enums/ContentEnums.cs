namespace BrainMemo.Content.Contracts.Enums;

public enum ChapterStatus
{
    Draft = 1,
    Published = 2
}

public enum BlockType
{
    RichText = 1,
    Image = 2,
    Video = 3,
    Audio = 4,
    File = 5,
    Markdown = 6,
    Flashcard = 7,
    Question = 8,
    Assignment = 9,
    Quiz = 10
}

public enum ResourceKind
{
    Image = 1,
    Video = 2,
    Audio = 3,
    Pdf = 4,
    Archive = 5,
    Other = 6
}

public enum DifficultyScheme
{
    EasyHard = 1,
    Level15 = 2,
    Cognitive4 = 3
}

public enum QuestionType
{
    MultipleChoice = 1,
    TrueFalse = 2,
    FillBlank = 3,
    Matching = 4,
    ShortEssay = 5,
    Essay = 6
}

public enum QuestionStatus
{
    Draft = 1,
    Ready = 2,
    Archived = 3
}

public enum QuestionOrigin
{
    Manual = 1,
    Ai = 2
}

public enum AiReviewStatus
{
    NotApplicable = 1,
    Pending = 2,
    Approved = 3
}

public enum QuizResultDisplay
{
    AfterEachAnswer = 1,
    AfterSubmit = 2,
    AfterClose = 3,
    AfterGrading = 4
}

public enum QuizPrerequisiteKind
{
    Chapter = 1,
    Block = 2
}
