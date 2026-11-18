using BrainMemo.Learning.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Learning.Infrastructure.Persistence.Converters;

internal sealed class BigEndianGuidBytesConverter()
    : ValueConverter<Guid, byte[]>(
        guid => guid.ToByteArray(true),
        bytes => new Guid(bytes, true));

internal sealed class NullableBigEndianGuidBytesConverter()
    : ValueConverter<Guid?, byte[]?>(
        guid => guid.HasValue ? guid.Value.ToByteArray(true) : null,
        bytes => bytes == null ? null : new Guid(bytes, true));

/// <summary>
/// Converts <see cref="LearningBlockType"/> to/from MySQL ENUM string matching lrn_block_completion.block_type.
/// </summary>
internal sealed class LearningBlockTypeValueConverter()
    : ValueConverter<LearningBlockType, string>(
        type => ToDbString(type),
        str => FromDbString(str))
{
    public static string ToDbString(LearningBlockType type) => type switch
    {
        LearningBlockType.RichText => "RICH_TEXT",
        LearningBlockType.Image => "IMAGE",
        LearningBlockType.Video => "VIDEO",
        LearningBlockType.Audio => "AUDIO",
        LearningBlockType.File => "FILE",
        LearningBlockType.Markdown => "MARKDOWN",
        LearningBlockType.Flashcard => "FLASHCARD",
        LearningBlockType.Question => "QUESTION",
        LearningBlockType.Assignment => "ASSIGNMENT",
        LearningBlockType.Quiz => "QUIZ",
        _ => "RICH_TEXT"
    };

    public static LearningBlockType FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "RICHTEXT" => LearningBlockType.RichText,
        "IMAGE" => LearningBlockType.Image,
        "VIDEO" => LearningBlockType.Video,
        "AUDIO" => LearningBlockType.Audio,
        "FILE" => LearningBlockType.File,
        "MARKDOWN" => LearningBlockType.Markdown,
        "FLASHCARD" => LearningBlockType.Flashcard,
        "QUESTION" => LearningBlockType.Question,
        "ASSIGNMENT" => LearningBlockType.Assignment,
        "QUIZ" => LearningBlockType.Quiz,
        _ => Enum.TryParse<LearningBlockType>(str.Replace("_", string.Empty), true, out var val) ? val : LearningBlockType.RichText
    };
}
