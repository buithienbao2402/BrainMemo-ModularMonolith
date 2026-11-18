using BrainMemo.Content.Domain.Entities;
using BrainMemo.Content.Domain.Enums;
using BrainMemo.SharedKernel.Results;

namespace BrainMemo.Content.Domain.Services;

public static class QuestionValidator
{
    public static Result ValidateForReady(
        QuestionType type,
        bool allowMultiple,
        string stem,
        string? explanation,
        string? referenceAnswer,
        IReadOnlyList<QuestionOption> options)
    {
        if (string.IsNullOrWhiteSpace(stem))
        {
            return Result.Failure(new Error("INVALID_STATE", "Nội dung câu hỏi (stem) không được để trống."));
        }

        switch (type)
        {
            case QuestionType.MultipleChoice:
                if (options.Count < 2)
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn."));
                }
                int correctCount = options.Count(o => o.IsCorrect);
                if (!allowMultiple)
                {
                    if (correctCount != 1)
                    {
                        return Result.Failure(new Error("INVALID_STATE", "Câu hỏi đơn lựa chọn phải có đúng 1 đáp án đúng."));
                    }
                }
                else
                {
                    if (correctCount < 1)
                    {
                        return Result.Failure(new Error("INVALID_STATE", "Câu hỏi nhiều lựa chọn phải có ít nhất 1 đáp án đúng."));
                    }
                }
                break;

            case QuestionType.TrueFalse:
                if (options.Count != 2)
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi Đúng/Sai phải có đúng 2 lựa chọn."));
                }
                if (options.Count(o => o.IsCorrect) != 1)
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi Đúng/Sai phải có đúng 1 đáp án đúng."));
                }
                break;

            case QuestionType.FillBlank:
                if (options.Count < 1)
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi điền khuyết phải có ít nhất 1 chỗ trống."));
                }
                if (options.Any(o => !o.BlankNo.HasValue || string.IsNullOrWhiteSpace(o.Content)))
                {
                    return Result.Failure(new Error("INVALID_STATE", "Mỗi chỗ trống trong câu hỏi điền khuyết phải có số thứ tự và đáp án không rỗng."));
                }
                break;

            case QuestionType.Matching:
                if (options.Count < 2)
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi nối cặp phải có ít nhất 2 cặp nối."));
                }
                if (options.Any(o => string.IsNullOrWhiteSpace(o.Content) || string.IsNullOrWhiteSpace(o.MatchContent)))
                {
                    return Result.Failure(new Error("INVALID_STATE", "Mỗi cặp nối phải có cả vế trái và vế phải."));
                }
                break;

            case QuestionType.ShortEssay:
            case QuestionType.Essay:
                if (string.IsNullOrWhiteSpace(referenceAnswer) && string.IsNullOrWhiteSpace(explanation))
                {
                    return Result.Failure(new Error("INVALID_STATE", "Câu hỏi tự luận phải có đáp án mẫu hoặc lời giải thích."));
                }
                break;

            default:
                return Result.Failure(new Error("INVALID_STATE", $"Loại câu hỏi '{type}' không được hỗ trợ."));
        }

        return Result.Success();
    }
}
