using BrainMemo.Course.Domain.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Course.Infrastructure.Persistence.Converters;

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
/// Converts <see cref="CourseAccessMode"/> to/from MySQL ENUM string matching crs_course.access_mode.
/// </summary>
internal sealed class CourseAccessModeValueConverter()
    : ValueConverter<CourseAccessMode, string>(
        mode => ToDbString(mode),
        str => FromDbString(str))
{
    public static string ToDbString(CourseAccessMode mode) => mode switch
    {
        CourseAccessMode.Public => "PUBLIC",
        CourseAccessMode.Private => "PRIVATE",
        CourseAccessMode.OnlyMe => "ONLY_ME",
        _ => "PUBLIC"
    };

    public static CourseAccessMode FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "PUBLIC" => CourseAccessMode.Public,
        "PRIVATE" => CourseAccessMode.Private,
        "ONLYME" => CourseAccessMode.OnlyMe,
        _ => Enum.TryParse<CourseAccessMode>(str.Replace("_", string.Empty), true, out var val) ? val : CourseAccessMode.Public
    };
}

/// <summary>
/// Converts <see cref="CoursePublishStatus"/> to/from MySQL ENUM string matching crs_course.publish_status.
/// </summary>
internal sealed class CoursePublishStatusValueConverter()
    : ValueConverter<CoursePublishStatus, string>(
        status => ToDbString(status),
        str => FromDbString(str))
{
    public static string ToDbString(CoursePublishStatus status) => status switch
    {
        CoursePublishStatus.Draft => "DRAFT",
        CoursePublishStatus.PendingApproval => "PENDING_APPROVAL",
        CoursePublishStatus.Published => "PUBLISHED",
        CoursePublishStatus.Rejected => "REJECTED",
        _ => "DRAFT"
    };

    public static CoursePublishStatus FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "DRAFT" => CoursePublishStatus.Draft,
        "PENDINGAPPROVAL" => CoursePublishStatus.PendingApproval,
        "PUBLISHED" => CoursePublishStatus.Published,
        "REJECTED" => CoursePublishStatus.Rejected,
        _ => Enum.TryParse<CoursePublishStatus>(str.Replace("_", string.Empty), true, out var val) ? val : CoursePublishStatus.Draft
    };
}

/// <summary>
/// Converts <see cref="EnrollmentStatus"/> to/from MySQL ENUM string matching crs_enrollment.status.
/// </summary>
internal sealed class EnrollmentStatusValueConverter()
    : ValueConverter<EnrollmentStatus, string>(
        status => ToDbString(status),
        str => FromDbString(str))
{
    public static string ToDbString(EnrollmentStatus status) => status switch
    {
        EnrollmentStatus.PendingApproval => "PENDING_APPROVAL",
        EnrollmentStatus.Invited => "INVITED",
        EnrollmentStatus.Active => "ACTIVE",
        EnrollmentStatus.Left => "LEFT",
        EnrollmentStatus.Removed => "REMOVED",
        _ => "PENDING_APPROVAL"
    };

    public static EnrollmentStatus FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "PENDINGAPPROVAL" => EnrollmentStatus.PendingApproval,
        "INVITED" => EnrollmentStatus.Invited,
        "ACTIVE" => EnrollmentStatus.Active,
        "LEFT" => EnrollmentStatus.Left,
        "REMOVED" => EnrollmentStatus.Removed,
        _ => Enum.TryParse<EnrollmentStatus>(str.Replace("_", string.Empty), true, out var val) ? val : EnrollmentStatus.PendingApproval
    };
}
