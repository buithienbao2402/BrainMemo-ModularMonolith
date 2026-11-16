namespace BrainMemo.Notification.Domain.Enums;

public enum NotificationType
{
    EnrollmentInviteJoin = 0,
    Enrollment = 1,
    Comment = 2,
    GradeFeedback = 3,
    NewChapter = 4,
    ReportResult = 5,
    Sanction = 6,
    SystemAnnouncement = 7,
}

public static class NotificationTypeExtensions
{
    public static string ToSnakeCaseUpper(this NotificationType type) => type switch
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
}

