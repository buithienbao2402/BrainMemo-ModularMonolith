namespace BrainMemo.Moderation.Contracts.Enums;

public enum ReportSource
{
    User = 0,
    Ai = 1,
}

public enum ReportTargetType
{
    Course = 0,
    Comment = 1,
}

public enum ReportStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2,
}

public enum EvidenceKind
{
    Image = 0,
    Link = 1,
}

public enum SanctionType
{
    CommentDelete = 0,
    CourseHide = 1,
    AccountLockTemporary = 2,
    AccountLockPermanent = 3,
    CoursePermanentDelete = 4,
}

public enum SanctionTargetType
{
    Comment = 0,
    Course = 1,
    User = 2,
}

public enum LiftKind
{
    Manual = 0,
    Expired = 1,
}

public enum AuditActorType
{
    Admin = 0,
    System = 1,
}

public enum AuditAction
{
    ReportAccepted = 0,
    ReportRejected = 1,
    CommentDeleted = 2,
    CommentRestored = 3,
    CourseHidden = 4,
    CourseRestored = 5,
    CoursePermanentlyDeleted = 6,
    AccountLockedTemporary = 7,
    AccountLockedPermanent = 8,
    AccountUnlocked = 9,
    CoursePublishApproved = 10,
    CoursePublishRejected = 11,
}

public enum AuditObjectType
{
    Report = 0,
    Course = 1,
    Comment = 2,
    User = 3,
}
