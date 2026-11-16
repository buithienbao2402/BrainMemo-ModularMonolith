using BrainMemo.Notification.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Notification.Infrastructure.Persistence.Converters;

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
/// Converts <see cref="NotificationType"/> to MySQL ENUM string matching ntf_notification.type.
/// </summary>
internal sealed class NotificationTypeValueConverter()
    : ValueConverter<NotificationType, string>(
        type => ToDbString(type),
        str => FromDbString(str))
{
    public static string ToDbString(NotificationType type) => type switch
    {
        NotificationType.EnrollmentInviteJoin => "ENROLLMENT_INVITE_JOIN",
        NotificationType.Enrollment => "ENROLLMENT",
        NotificationType.Comment => "COMMENT",
        NotificationType.GradeFeedback => "GRADE_FEEDBACK",
        NotificationType.NewChapter => "NEW_CHAPTER",
        NotificationType.ReportResult => "REPORT_RESULT",
        NotificationType.Sanction => "SANCTION",
        NotificationType.SystemAnnouncement => "SYSTEM_ANNOUNCEMENT",
        _ => type.ToString().ToUpperInvariant()
    };

    public static NotificationType FromDbString(string str) => str switch
    {
        "ENROLLMENT_INVITE_JOIN" => NotificationType.EnrollmentInviteJoin,
        "ENROLLMENT" => NotificationType.Enrollment,
        "COMMENT" => NotificationType.Comment,
        "GRADE_FEEDBACK" => NotificationType.GradeFeedback,
        "NEW_CHAPTER" => NotificationType.NewChapter,
        "REPORT_RESULT" => NotificationType.ReportResult,
        "SANCTION" => NotificationType.Sanction,
        "SYSTEM_ANNOUNCEMENT" => NotificationType.SystemAnnouncement,
        _ => Enum.Parse<NotificationType>(str, true)
    };
}
