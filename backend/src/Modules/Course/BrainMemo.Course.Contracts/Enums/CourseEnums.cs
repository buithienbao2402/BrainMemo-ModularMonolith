namespace BrainMemo.Course.Contracts.Enums;

public enum AccessMode
{
    Public = 1,
    Private = 2,
    OnlyMe = 3,
}

public enum CourseStatus
{
    Updating = 1,
    Completed = 2,
    Paused = 3,
}

public enum EnrollmentStatus
{
    PendingApproval = 1,
    Invited = 2,
    Active = 3,
    Left = 4,
    Removed = 5,
}

public enum AccessPurpose
{
    Normal = 0,
    ModerationReview = 1,
}

public enum UserCourseRelation
{
    Owned = 1,
    EnrolledActive = 2,
    Completed = 3,
}

public enum CourseAudience
{
    Self = 1,
    Public = 2,
}

public enum ActorKind
{
    User = 1,
    Admin = 2,
    System = 3,
}

public enum ChapterAccessMode
{
    Public = 1,
    Protected = 2,
}
