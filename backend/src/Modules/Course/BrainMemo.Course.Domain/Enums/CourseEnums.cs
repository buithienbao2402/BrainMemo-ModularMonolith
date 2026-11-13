namespace BrainMemo.Course.Domain.Enums;

public enum CourseAccessMode
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

public enum EnrollmentDecision
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
}

public enum ChapterAccessMode
{
    Public = 1,
    Protected = 2,
}
