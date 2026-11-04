namespace BrainMemo.Assessment.Domain.Entities;

public enum QuestionType { SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE }

public class QuizBlock
{
    public long QuizId { get; set; }
    public long BlockId { get; set; } // Logical ID (curriculum.blocks)
    public string Title { get; set; } = string.Empty;
    public decimal PassingScore { get; set; } = 70.00m;
    public int MaxAttempts { get; set; } = 3;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<QuizQuestion> Questions { get; set; } = new List<QuizQuestion>();
    public ICollection<QuizAttempt> Attempts { get; set; } = new List<QuizAttempt>();
}

public class QuizQuestion
{
    public long QuestionId { get; set; }
    public long QuizId { get; set; }
    public long CloId { get; set; } // Logical ID (curriculum.course_clos) - BẮT BUỘC NOT NULL
    public string QuestionText { get; set; } = string.Empty;
    public QuestionType QuestionType { get; set; } = QuestionType.SINGLE_CHOICE;
    public int BloomLevel { get; set; } = 1; // 1 đến 6
    public decimal CloWeight { get; set; } = 1.00m;
    public string? Explanation { get; set; }
    public int OrderIndex { get; set; } = 1;

    public QuizBlock? QuizBlock { get; set; }
    public ICollection<QuizOption> Options { get; set; } = new List<QuizOption>();
}

public class QuizOption
{
    public long OptionId { get; set; }
    public long QuestionId { get; set; }
    public string OptionText { get; set; } = string.Empty;
    public bool IsCorrect { get; set; } = false;
    public int OrderIndex { get; set; } = 1;

    public QuizQuestion? Question { get; set; }
}

public class QuizAttempt
{
    public long AttemptId { get; set; }
    public long QuizId { get; set; }
    public long StudentId { get; set; } // Logical ID (identity.users)
    public decimal Score { get; set; }
    public bool IsPassed { get; set; } = false;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public QuizBlock? QuizBlock { get; set; }
    public ICollection<QuizAttemptAnswer> Answers { get; set; } = new List<QuizAttemptAnswer>();
}

public class QuizAttemptAnswer
{
    public long AttemptAnswerId { get; set; }
    public long AttemptId { get; set; }
    public long QuestionId { get; set; } // Logical ID
    public bool IsCorrect { get; set; }

    public QuizAttempt? Attempt { get; set; }
    public ICollection<AttemptSelectedOption> SelectedOptions { get; set; } = new List<AttemptSelectedOption>();
}

// Bảng con hỗ trợ câu hỏi chọn nhiều đáp án (MULTIPLE_CHOICE)
public class AttemptSelectedOption
{
    public long AttemptAnswerId { get; set; }
    public long OptionId { get; set; } // Logical ID option

    public QuizAttemptAnswer? AttemptAnswer { get; set; }
}

public class FlashcardBlock
{
    public long FlashcardSetId { get; set; }
    public long BlockId { get; set; } // Logical ID (curriculum.blocks)
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Flashcard> Flashcards { get; set; } = new List<Flashcard>();
}

public class Flashcard
{
    public long FlashcardId { get; set; }
    public long FlashcardSetId { get; set; }
    public string FrontText { get; set; } = string.Empty;
    public string BackText { get; set; } = string.Empty;
    public string? RealWorldExample { get; set; }
    public int OrderIndex { get; set; } = 1;

    public FlashcardBlock? FlashcardBlock { get; set; }
}

public class CloResult
{
    public long ResultId { get; set; }
    public long CourseId { get; set; } // Logical ID
    public long StudentId { get; set; } // Logical ID
    public long CloId { get; set; } // Logical ID
    public decimal ScorePercentage { get; set; }
    public int RubricLevel { get; set; } // 0 đến 4
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
}