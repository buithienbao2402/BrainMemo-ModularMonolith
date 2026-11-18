using BrainMemo.Content.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Content.Infrastructure.Persistence.Converters;

/// <summary>
/// Converts <see cref="Guid"/> to big-endian 16-byte RFC 4122 bytes matching MySQL <c>UUID_TO_BIN(uuid)</c>.
/// </summary>
internal sealed class BigEndianGuidBytesConverter()
    : ValueConverter<Guid, byte[]>(
        guid => guid.ToByteArray(true),
        bytes => new Guid(bytes, true));

/// <summary>
/// Nullable counterpart of <see cref="BigEndianGuidBytesConverter"/> for optional <c>BINARY(16)</c> columns.
/// </summary>
internal sealed class NullableBigEndianGuidBytesConverter()
    : ValueConverter<Guid?, byte[]?>(
        guid => guid.HasValue ? guid.Value.ToByteArray(true) : null,
        bytes => bytes == null ? null : new Guid(bytes, true));

/// <summary>
/// Converts <see cref="BlockType"/> to/from MySQL ENUM string matching cnt_block.block_type.
/// </summary>
internal sealed class BlockTypeValueConverter()
    : ValueConverter<BlockType, string>(
        type => ToDbString(type),
        str => FromDbString(str))
{
    public static string ToDbString(BlockType type) => type switch
    {
        BlockType.RichText => "RICH_TEXT",
        BlockType.Image => "IMAGE",
        BlockType.Video => "VIDEO",
        BlockType.Audio => "AUDIO",
        BlockType.File => "FILE",
        BlockType.Markdown => "MARKDOWN",
        BlockType.Flashcard => "FLASHCARD",
        BlockType.Question => "QUESTION",
        BlockType.Assignment => "ASSIGNMENT",
        BlockType.Quiz => "QUIZ",
        _ => "RICH_TEXT"
    };

    public static BlockType FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "RICHTEXT" => BlockType.RichText,
        "IMAGE" => BlockType.Image,
        "VIDEO" => BlockType.Video,
        "AUDIO" => BlockType.Audio,
        "FILE" => BlockType.File,
        "MARKDOWN" => BlockType.Markdown,
        "FLASHCARD" => BlockType.Flashcard,
        "QUESTION" => BlockType.Question,
        "ASSIGNMENT" => BlockType.Assignment,
        "QUIZ" => BlockType.Quiz,
        _ => Enum.TryParse<BlockType>(str.Replace("_", string.Empty), true, out var val) ? val : BlockType.RichText
    };
}

/// <summary>
/// Converts <see cref="AiReviewStatus"/> to/from MySQL ENUM string matching cnt_block.ai_review_status.
/// </summary>
internal sealed class AiReviewStatusValueConverter()
    : ValueConverter<AiReviewStatus, string>(
        status => ToDbString(status),
        str => FromDbString(str))
{
    public static string ToDbString(AiReviewStatus status) => status switch
    {
        AiReviewStatus.Pending => "PENDING",
        AiReviewStatus.Approved => "APPROVED",
        _ => "NOT_APPLICABLE"
    };

    public static AiReviewStatus FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "NOTAPPLICABLE" => AiReviewStatus.NotApplicable,
        "PENDING" => AiReviewStatus.Pending,
        "APPROVED" => AiReviewStatus.Approved,
        _ => Enum.TryParse<AiReviewStatus>(str.Replace("_", string.Empty), true, out var val) ? val : AiReviewStatus.NotApplicable
    };
}

/// <summary>
/// Converts <see cref="QuestionType"/> to/from MySQL ENUM string matching cnt_question.question_type.
/// </summary>
internal sealed class QuestionTypeValueConverter()
    : ValueConverter<QuestionType, string>(
        type => ToDbString(type),
        str => FromDbString(str))
{
    public static string ToDbString(QuestionType type) => type switch
    {
        QuestionType.MultipleChoice => "MULTIPLE_CHOICE",
        QuestionType.TrueFalse => "TRUE_FALSE",
        QuestionType.FillBlank => "FILL_BLANK",
        QuestionType.Matching => "MATCHING",
        QuestionType.ShortEssay => "SHORT_ESSAY",
        QuestionType.Essay => "ESSAY",
        _ => "MULTIPLE_CHOICE"
    };

    public static QuestionType FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "MULTIPLECHOICE" => QuestionType.MultipleChoice,
        "TRUEFALSE" => QuestionType.TrueFalse,
        "FILLBLANK" => QuestionType.FillBlank,
        "MATCHING" => QuestionType.Matching,
        "SHORTESSAY" => QuestionType.ShortEssay,
        "ESSAY" => QuestionType.Essay,
        _ => Enum.TryParse<QuestionType>(str.Replace("_", string.Empty), true, out var val) ? val : QuestionType.MultipleChoice
    };
}

/// <summary>
/// Nullable counterpart of <see cref="QuestionTypeValueConverter"/>.
/// </summary>
internal sealed class NullableQuestionTypeValueConverter()
    : ValueConverter<QuestionType?, string?>(
        type => type.HasValue ? QuestionTypeValueConverter.ToDbString(type.Value) : null,
        str => string.IsNullOrWhiteSpace(str) ? null : QuestionTypeValueConverter.FromDbString(str));

/// <summary>
/// Converts <see cref="DifficultyScheme"/> to/from MySQL ENUM string matching cnt_question_bank.difficulty_scheme.
/// </summary>
internal sealed class DifficultySchemeValueConverter()
    : ValueConverter<DifficultyScheme?, string?>(
        scheme => ToDbString(scheme),
        str => FromDbString(str))
{
    public static string? ToDbString(DifficultyScheme? scheme) => scheme switch
    {
        DifficultyScheme.EasyHard => "EASY_HARD",
        DifficultyScheme.Level15 => "LEVEL_1_5",
        DifficultyScheme.Cognitive4 => "COGNITIVE_4",
        _ => null
    };

    public static DifficultyScheme? FromDbString(string? str)
    {
        if (string.IsNullOrWhiteSpace(str)) return null;
        return str.Replace("_", string.Empty).ToUpperInvariant() switch
        {
            "EASYHARD" => DifficultyScheme.EasyHard,
            "LEVEL15" => DifficultyScheme.Level15,
            "COGNITIVE4" => DifficultyScheme.Cognitive4,
            _ => Enum.TryParse<DifficultyScheme>(str.Replace("_", string.Empty), true, out var val) ? val : null
        };
    }
}

/// <summary>
/// Converts <see cref="QuizResultDisplay"/> to/from MySQL ENUM string matching cnt_quiz_config.result_display.
/// </summary>
internal sealed class QuizResultDisplayValueConverter()
    : ValueConverter<QuizResultDisplay, string>(
        display => ToDbString(display),
        str => FromDbString(str))
{
    public static string ToDbString(QuizResultDisplay display) => display switch
    {
        QuizResultDisplay.AfterEachAnswer => "AFTER_EACH_ANSWER",
        QuizResultDisplay.AfterSubmit => "AFTER_SUBMIT",
        QuizResultDisplay.AfterClose => "AFTER_CLOSE",
        QuizResultDisplay.AfterGrading => "AFTER_GRADING",
        _ => "AFTER_SUBMIT"
    };

    public static QuizResultDisplay FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "AFTEREACHANSWER" => QuizResultDisplay.AfterEachAnswer,
        "AFTERSUBMIT" => QuizResultDisplay.AfterSubmit,
        "AFTERCLOSE" => QuizResultDisplay.AfterClose,
        "AFTERGRADING" => QuizResultDisplay.AfterGrading,
        _ => Enum.TryParse<QuizResultDisplay>(str.Replace("_", string.Empty), true, out var val) ? val : QuizResultDisplay.AfterSubmit
    };
}
