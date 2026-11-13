using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;

namespace BrainMemo.Course.Application.Common;

public static class CourseAccessEvaluator
{
    public static CourseAccessDto EvaluateCourseAccess(
        CourseEntity? course,
        Guid? viewerUserId,
        Enrollment? enrollment,
        AccessPurpose purpose = AccessPurpose.Normal)
    {
        // (1) Not found
        if (course is null)
        {
            return new CourseAccessDto(
                Exists: false,
                EffectiveState: "NOT_FOUND",
                AccessMode: "NONE",
                OwnerUserId: Guid.Empty,
                IsOwner: false,
                EnrollmentStatus: null,
                CanViewInfo: false,
                CanReadContent: false,
                CanLearn: false,
                ReasonCode: "NOT_FOUND");
        }

        string effectiveState = course.IsDeleted
            ? "DELETED"
            : course.IsHidden
                ? "HIDDEN"
                : "ACTIVE";

        string accessModeStr = course.AccessMode switch
        {
            CourseAccessMode.Public => "PUBLIC",
            CourseAccessMode.Private => "PRIVATE",
            CourseAccessMode.OnlyMe => "ONLY_ME",
            _ => "PUBLIC"
        };

        bool isOwner = viewerUserId.HasValue && viewerUserId.Value == course.OwnerUserId;
        string? enrollmentStatusStr = enrollment?.Status.ToString().ToUpperInvariant();

        // (2) Course owner - allowed all operations, even when hidden or soft deleted
        if (isOwner)
        {
            return new CourseAccessDto(
                Exists: true,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: true,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: true,
                ReasonCode: "OWNER");
        }

        // (3) ONLY_ME - denied to everyone else, EVEN ADMIN AND MODERATION REVIEW (3.5.8.1 + DEC-02)
        if (course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return new CourseAccessDto(
                Exists: true,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: false,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: false,
                CanReadContent: false,
                CanLearn: false,
                ReasonCode: "ONLY_ME");
        }

        // (3b / 4) ModerationReview - allows read-only (CanReadContent=true, CanLearn=false) for Private/Hidden/Deleted/Public
        if (purpose == AccessPurpose.ModerationReview)
        {
            return new CourseAccessDto(
                Exists: true,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: false,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: false,
                ReasonCode: "MODERATION_REVIEW");
        }

        // (5) Hidden or Deleted course - denied to all non-owners
        if (course.IsDeleted || course.IsHidden)
        {
            return new CourseAccessDto(
                Exists: true,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: false,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: false,
                CanReadContent: false,
                CanLearn: false,
                ReasonCode: course.IsDeleted ? "COURSE_DELETED" : "COURSE_HIDDEN");
        }

        // (6) PUBLIC
        if (course.AccessMode == CourseAccessMode.Public)
        {
            bool canLearn = viewerUserId.HasValue; // Only authenticated users can save progress/learn
            return new CourseAccessDto(
                Exists: true,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: false,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: true,
                CanReadContent: true,
                CanLearn: canLearn,
                ReasonCode: "PUBLIC_ACCESS");
        }

        // (7) PRIVATE - Only active enrolled learners can read content & learn
        bool isActiveEnrollment = enrollment?.Status == Domain.Enums.EnrollmentStatus.Active;
        return new CourseAccessDto(
            Exists: true,
            EffectiveState: effectiveState,
            AccessMode: accessModeStr,
            OwnerUserId: course.OwnerUserId,
            IsOwner: false,
            EnrollmentStatus: enrollmentStatusStr,
            CanViewInfo: true,
            CanReadContent: isActiveEnrollment,
            CanLearn: isActiveEnrollment,
            ReasonCode: isActiveEnrollment ? "ENROLLED" : "ENROLLMENT_REQUIRED");
    }

    public static ChapterAccessResult EvaluateChapterAccess(
        ChapterAccess? chapterAccess,
        CourseAccessDto courseAccess,
        ChapterUnlock? unlock)
    {
        if (!courseAccess.CanReadContent)
        {
            return new ChapterAccessResult(false, false, "COURSE_DENIED");
        }

        if (chapterAccess is null)
        {
            return new ChapterAccessResult(true, courseAccess.CanLearn, "OK");
        }

        if (chapterAccess.AccessMode == BrainMemo.Course.Domain.Enums.ChapterAccessMode.Protected)
        {
            if (courseAccess.IsOwner)
            {
                return new ChapterAccessResult(true, courseAccess.CanLearn, "OK");
            }

            if (unlock != null && unlock.PasscodeVersion == chapterAccess.PasscodeVersion)
            {
                return new ChapterAccessResult(true, courseAccess.CanLearn, "OK");
            }

            return new ChapterAccessResult(false, false, "PASSCODE_REQUIRED");
        }

        return new ChapterAccessResult(true, courseAccess.CanLearn, "OK");
    }
}
