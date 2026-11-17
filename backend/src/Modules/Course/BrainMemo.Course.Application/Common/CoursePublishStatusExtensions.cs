using BrainMemo.Course.Domain.Enums;

namespace BrainMemo.Course.Application.Common;

public static class CoursePublishStatusExtensions
{
    public static string ToApiString(this CoursePublishStatus status) => status switch
    {
        CoursePublishStatus.Draft => "DRAFT",
        CoursePublishStatus.PendingApproval => "PENDING_APPROVAL",
        CoursePublishStatus.Published => "PUBLISHED",
        CoursePublishStatus.Rejected => "REJECTED",
        _ => "DRAFT",
    };
}
