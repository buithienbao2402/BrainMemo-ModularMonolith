using BrainMemo.Content.Domain.Enums;

namespace BrainMemo.Content.Domain.Entities;

public class QuizConfig
{
    private QuizConfig() { }

    public QuizConfig(
        Guid blockId,
        DateTimeOffset? openAt = null,
        DateTimeOffset? closeAt = null,
        ushort? timeLimitMinutes = null,
        ushort? maxAttempts = 1,
        decimal? passScore = null,
        QuizResultDisplay resultDisplay = QuizResultDisplay.AfterSubmit,
        bool shuffleQuestions = false,
        bool shuffleOptions = false,
        string? passwordHash = null)
    {
        BlockId = blockId;
        OpenAt = openAt;
        CloseAt = closeAt;
        TimeLimitMinutes = timeLimitMinutes;
        MaxAttempts = maxAttempts;
        PassScore = passScore;
        ResultDisplay = resultDisplay;
        ShuffleQuestions = shuffleQuestions;
        ShuffleOptions = shuffleOptions;
        PasswordHash = passwordHash;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public Guid BlockId { get; private set; }
    public DateTimeOffset? OpenAt { get; private set; }
    public DateTimeOffset? CloseAt { get; private set; }
    public ushort? TimeLimitMinutes { get; private set; }
    public ushort? MaxAttempts { get; private set; }
    public decimal? PassScore { get; private set; }
    public QuizResultDisplay ResultDisplay { get; private set; }
    public bool ShuffleQuestions { get; private set; }
    public bool ShuffleOptions { get; private set; }
    public string? PasswordHash { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public void Update(
        DateTimeOffset? openAt,
        DateTimeOffset? closeAt,
        ushort? timeLimitMinutes,
        ushort? maxAttempts,
        decimal? passScore,
        QuizResultDisplay resultDisplay,
        bool shuffleQuestions,
        bool shuffleOptions,
        string? passwordHash)
    {
        OpenAt = openAt;
        CloseAt = closeAt;
        TimeLimitMinutes = timeLimitMinutes;
        MaxAttempts = maxAttempts;
        PassScore = passScore;
        ResultDisplay = resultDisplay;
        ShuffleQuestions = shuffleQuestions;
        ShuffleOptions = shuffleOptions;
        if (passwordHash != null) PasswordHash = passwordHash;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
