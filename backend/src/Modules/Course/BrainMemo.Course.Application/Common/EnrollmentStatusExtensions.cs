using BrainMemo.Course.Domain.Enums;

namespace BrainMemo.Course.Application.Common;

public static class EnrollmentStatusExtensions
{
    public static string ToStatusString(this EnrollmentStatus status) => status switch
    {
        EnrollmentStatus.PendingApproval => "PENDING_APPROVAL",
        EnrollmentStatus.Invited => "INVITED",
        EnrollmentStatus.Active => "ACTIVE",
        EnrollmentStatus.Left => "LEFT",
        EnrollmentStatus.Removed => "REMOVED",
        _ => status.ToString().ToUpperInvariant(),
    };
}
