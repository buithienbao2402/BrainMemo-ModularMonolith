using BrainMemo.Learning.Contracts.Dtos;

namespace BrainMemo.Assessment.Application.Grading;

public interface IGradingStrategy
{
    bool CanHandle(string questionType);
    QuestionGradingResult Grade(GradingQuestionItemDto question);
}

public sealed record QuestionGradingResult(
    decimal? PointsEarned,
    bool? IsCorrect,
    bool PendingManual);

public sealed class MultipleChoiceGradingStrategy : IGradingStrategy
{
    public bool CanHandle(string questionType) =>
        questionType.Equals("MULTIPLE_CHOICE", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("MultipleChoice", StringComparison.OrdinalIgnoreCase);

    public QuestionGradingResult Grade(GradingQuestionItemDto question)
    {
        var correctOptionIds = question.Options.Where(o => o.IsCorrect).Select(o => o.Id).ToHashSet();
        var selectedIds = question.StudentAnswer?.SelectedOptionIds?.ToHashSet() ?? [];

        if (selectedIds.Count == 0)
        {
            return new QuestionGradingResult(0m, false, false);
        }

        if (!question.AllowMultiple)
        {
            if (selectedIds.Count == 1 && correctOptionIds.Contains(selectedIds.First()))
            {
                return new QuestionGradingResult(question.MaxPoints, true, false);
            }
            return new QuestionGradingResult(0m, false, false);
        }
        else
        {
            bool isCorrect = selectedIds.SetEquals(correctOptionIds);
            return new QuestionGradingResult(isCorrect ? question.MaxPoints : 0m, isCorrect, false);
        }
    }
}

public sealed class TrueFalseGradingStrategy : IGradingStrategy
{
    public bool CanHandle(string questionType) =>
        questionType.Equals("TRUE_FALSE", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("TrueFalse", StringComparison.OrdinalIgnoreCase);

    public QuestionGradingResult Grade(GradingQuestionItemDto question)
    {
        var correctOptionId = question.Options.FirstOrDefault(o => o.IsCorrect)?.Id;
        var selectedIds = question.StudentAnswer?.SelectedOptionIds ?? [];

        if (correctOptionId.HasValue && selectedIds.Count == 1 && selectedIds[0] == correctOptionId.Value)
        {
            return new QuestionGradingResult(question.MaxPoints, true, false);
        }

        return new QuestionGradingResult(0m, false, false);
    }
}

public sealed class FillBlankGradingStrategy : IGradingStrategy
{
    public bool CanHandle(string questionType) =>
        questionType.Equals("FILL_BLANK", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("FillBlank", StringComparison.OrdinalIgnoreCase);

    public QuestionGradingResult Grade(GradingQuestionItemDto question)
    {
        string studentText = question.StudentAnswer?.TextAnswer?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(studentText))
        {
            return new QuestionGradingResult(0m, false, false);
        }

        var correctBlanks = question.Options.Where(o => o.BlankNo.HasValue).OrderBy(o => o.BlankNo).ToList();
        if (correctBlanks.Count == 0)
        {
            bool isRefMatch = !string.IsNullOrWhiteSpace(question.ReferenceAnswer) &&
                string.Equals(studentText, question.ReferenceAnswer.Trim(), StringComparison.OrdinalIgnoreCase);
            return new QuestionGradingResult(isRefMatch ? question.MaxPoints : 0m, isRefMatch, false);
        }

        var studentParts = studentText.Split(';', StringSplitOptions.TrimEntries);
        int correctCount = 0;
        for (int i = 0; i < correctBlanks.Count; i++)
        {
            if (i < studentParts.Length && string.Equals(studentParts[i], correctBlanks[i].Content.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                correctCount++;
            }
        }

        bool allCorrect = correctCount == correctBlanks.Count;
        decimal points = correctBlanks.Count > 0 ? (question.MaxPoints * correctCount / correctBlanks.Count) : 0m;
        return new QuestionGradingResult(points, allCorrect, false);
    }
}

public sealed class MatchingGradingStrategy : IGradingStrategy
{
    public bool CanHandle(string questionType) =>
        questionType.Equals("MATCHING", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("Matching", StringComparison.OrdinalIgnoreCase);

    public QuestionGradingResult Grade(GradingQuestionItemDto question)
    {
        var studentMatches = question.StudentAnswer?.Matches ?? new Dictionary<Guid, string>();
        var validOptions = question.Options.Where(o => !string.IsNullOrEmpty(o.MatchContent)).ToList();

        if (validOptions.Count == 0 || studentMatches.Count == 0)
        {
            return new QuestionGradingResult(0m, false, false);
        }

        int correctCount = 0;
        foreach (var opt in validOptions)
        {
            if (studentMatches.TryGetValue(opt.Id, out var studentMatchVal) &&
                string.Equals(studentMatchVal?.Trim(), opt.MatchContent?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                correctCount++;
            }
        }

        bool allCorrect = correctCount == validOptions.Count;
        decimal points = validOptions.Count > 0 ? (question.MaxPoints * correctCount / validOptions.Count) : 0m;
        return new QuestionGradingResult(points, allCorrect, false);
    }
}

public sealed class EssayGradingStrategy : IGradingStrategy
{
    public bool CanHandle(string questionType) =>
        questionType.Equals("ESSAY", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("Essay", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("SHORT_ESSAY", StringComparison.OrdinalIgnoreCase) ||
        questionType.Equals("ShortEssay", StringComparison.OrdinalIgnoreCase);

    public QuestionGradingResult Grade(GradingQuestionItemDto question)
    {
        return new QuestionGradingResult(null, null, PendingManual: true);
    }
}
