using System;
using BrainMemo.Moderation.Contracts.Enums;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BrainMemo.Moderation.Infrastructure.Persistence.Converters;

internal sealed class BigEndianGuidBytesConverter()
    : ValueConverter<Guid, byte[]>(
        guid => guid.ToByteArray(true),
        bytes => new Guid(bytes, true));

internal sealed class NullableBigEndianGuidBytesConverter()
    : ValueConverter<Guid?, byte[]?>(
        guid => guid.HasValue ? guid.Value.ToByteArray(true) : null,
        bytes => bytes == null ? null : new Guid(bytes, true));

internal sealed class AuditActionValueConverter()
    : ValueConverter<AuditAction, string>(
        action => ToDbString(action),
        str => FromDbString(str))
{
    public static string ToDbString(AuditAction action) => action switch
    {
        AuditAction.ReportAccepted => "REPORT_ACCEPTED",
        AuditAction.ReportRejected => "REPORT_REJECTED",
        AuditAction.CommentDeleted => "COMMENT_DELETED",
        AuditAction.CommentRestored => "COMMENT_RESTORED",
        AuditAction.CourseHidden => "COURSE_HIDDEN",
        AuditAction.CourseRestored => "COURSE_RESTORED",
        AuditAction.CoursePermanentlyDeleted => "COURSE_PERMANENTLY_DELETED",
        AuditAction.AccountLockedTemporary => "ACCOUNT_LOCKED_TEMPORARY",
        AuditAction.AccountLockedPermanent => "ACCOUNT_LOCKED_PERMANENT",
        AuditAction.AccountUnlocked => "ACCOUNT_UNLOCKED",
        AuditAction.CoursePublishApproved => "COURSE_PUBLISH_APPROVED",
        AuditAction.CoursePublishRejected => "COURSE_PUBLISH_REJECTED",
        _ => "REPORT_ACCEPTED"
    };

    public static AuditAction FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "REPORTACCEPTED" => AuditAction.ReportAccepted,
        "REPORTREJECTED" => AuditAction.ReportRejected,
        "COMMENTDELETED" => AuditAction.CommentDeleted,
        "COMMENTRESTORED" => AuditAction.CommentRestored,
        "COURSEHIDDEN" => AuditAction.CourseHidden,
        "COURSERESTORED" => AuditAction.CourseRestored,
        "COURSEPERMANENTLYDELETED" => AuditAction.CoursePermanentlyDeleted,
        "ACCOUNTLOCKEDTEMPORARY" => AuditAction.AccountLockedTemporary,
        "ACCOUNTLOCKEDPERMANENT" => AuditAction.AccountLockedPermanent,
        "ACCOUNTUNLOCKED" => AuditAction.AccountUnlocked,
        "COURSEPUBLISHAPPROVED" => AuditAction.CoursePublishApproved,
        "COURSEPUBLISHREJECTED" => AuditAction.CoursePublishRejected,
        _ => Enum.TryParse<AuditAction>(str.Replace("_", string.Empty), true, out var val) ? val : AuditAction.ReportAccepted
    };
}

internal sealed class AuditActorTypeValueConverter()
    : ValueConverter<AuditActorType, string>(
        actor => actor == AuditActorType.System ? "SYSTEM" : "ADMIN",
        str => str.ToUpperInvariant() == "SYSTEM" ? AuditActorType.System : AuditActorType.Admin);

internal sealed class AuditObjectTypeValueConverter()
    : ValueConverter<AuditObjectType, string>(
        obj => ToDbString(obj),
        str => FromDbString(str))
{
    public static string ToDbString(AuditObjectType obj) => obj switch
    {
        AuditObjectType.Report => "REPORT",
        AuditObjectType.Course => "COURSE",
        AuditObjectType.Comment => "COMMENT",
        AuditObjectType.User => "USER",
        _ => "REPORT"
    };

    public static AuditObjectType FromDbString(string str) => str.ToUpperInvariant() switch
    {
        "REPORT" => AuditObjectType.Report,
        "COURSE" => AuditObjectType.Course,
        "COMMENT" => AuditObjectType.Comment,
        "USER" => AuditObjectType.User,
        _ => AuditObjectType.Report
    };
}

internal sealed class SanctionTypeValueConverter()
    : ValueConverter<SanctionType, string>(
        type => ToDbString(type),
        str => FromDbString(str))
{
    public static string ToDbString(SanctionType type) => type switch
    {
        SanctionType.CommentDelete => "COMMENT_DELETE",
        SanctionType.CourseHide => "COURSE_HIDE",
        SanctionType.AccountLockTemporary => "ACCOUNT_LOCK_TEMPORARY",
        SanctionType.AccountLockPermanent => "ACCOUNT_LOCK_PERMANENT",
        SanctionType.CoursePermanentDelete => "COURSE_PERMANENT_DELETE",
        _ => "COMMENT_DELETE"
    };

    public static SanctionType FromDbString(string str) => str.Replace("_", string.Empty).ToUpperInvariant() switch
    {
        "COMMENTDELETE" => SanctionType.CommentDelete,
        "COURSEHIDE" => SanctionType.CourseHide,
        "ACCOUNTLOCKTEMPORARY" => SanctionType.AccountLockTemporary,
        "ACCOUNTLOCKPERMANENT" => SanctionType.AccountLockPermanent,
        "COURSEPERMANENTDELETE" => SanctionType.CoursePermanentDelete,
        _ => Enum.TryParse<SanctionType>(str.Replace("_", string.Empty), true, out var val) ? val : SanctionType.CommentDelete
    };
}
