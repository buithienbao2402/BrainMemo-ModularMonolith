using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;

namespace BrainMemo.Course.Application.Common;

public static class CourseAccessEvaluator
{
    public static CourseAccessDto EvaluateCourseAccess(
        Entities.Course? course,
        Guid? viewerUserId,
        Enrollment? enrollment,
        AccessPurpose purpose = AccessPurpose.Normal)
    {
        // (1) Not found
        if (course is null)
        {
            return new CourseAccessDto(
                Exists: false,
                EffectiveState: "DELETED",
                AccessMode: "PUBLIC",
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

        string accessModeStr = course.AccessMode.ToString().ToUpperInvariant();
        string? enrollmentStatusStr = enrollment?.Status.ToString().ToUpperInvariant();

        bool isOwner = viewerUserId.HasValue && viewerUserId.Value == course.OwnerUserId;

        // (2) Owner: allow all owner actions (even when Hidden or Soft-deleted)
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
                ReasonCode: "OK");
        }

        // (3) ONLY_ME: reject everyone else, even Admin and ModerationReview (DEC-02)
        if (course.AccessMode == CourseAccessMode.OnlyMe)
        {
            return new CourseAccessDto(
                Exists: false, // Hidden from others
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

        // (3b) purpose=ModerationReview: read-only for Private / Hidden / Deleted / Public
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
                CanLearn: false, // Read-only: learning/progress forbidden
                ReasonCode: "MODERATION_REVIEW");
        }

        // (4) Hidden or Soft-deleted: reject non-owner viewers (hide existence per DEC-16)
        if (course.IsHidden || course.IsDeleted)
        {
            return new CourseAccessDto(
                Exists: false,
                EffectiveState: effectiveState,
                AccessMode: accessModeStr,
                OwnerUserId: course.OwnerUserId,
                IsOwner: false,
                EnrollmentStatus: enrollmentStatusStr,
                CanViewInfo: false,
                CanReadContent: false,
                CanLearn: false,
                ReasonCode: course.IsDeleted ? "DELETED" : "HIDDEN");
        }

        // (5) PUBLIC
        if (course.AccessMode == CourseAccessMode.Public)
        {
            bool canLearn = viewerUserId.HasValue;
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
                ReasonCode: "OK");
        }

        // (6) PRIVATE: only ACTIVE enrollments can view content & learn
        bool isActiveEnrollment = enrollment?.Status == Domain.Enums.EnrollmentStatus.Active;
        return new CourseAccessDto(
            Exists: true,
            EffectiveState: effectiveState,
            AccessMode: accessModeStr,
            OwnerUserId: course.OwnerUserId,
            IsOwner: false,
            EnrollmentStatus: enrollmentStatusStr,
            CanViewInfo: true, // Can view general course card / landing info
            CanReadContent: isActiveEnrollment,
            CanLearn: isActiveEnrollment && viewerUserId.HasValue,
            ReasonCode: isActiveEnrollment ? "OK" : "PRIVATE_ENROLLMENT_REQUIRED");
    }

    public static ChapterAccessResult EvaluateChapterAccess(
        CourseAccessDto courseAccess,
        ChapterAccess? chapterAccess,
        ChapterUnlock? chapterUnlock)
    {
        if (!courseAccess.Exists || !courseAccess.CanReadContent)
        {
            return new ChapterAccessResult(
                Allowed: false,
                CanSaveProgress: false,
                Reason: "COURSE_DENIED");
        }

        if (chapterAccess is null || chapterAccess.AccessMode == ChapterAccessMode.Public)
        {
            return new ChapterAccessResult(
                Allowed: true,
                CanSaveProgress: courseAccess.CanLearn,
                Reason: "OK");
        }

        // Protected chapter
        if (courseAccess.IsOwner)
        {
            return new ChapterAccessResult(
                Allowed: true,
                CanSaveProgress: true,
                Reason: "OK");
        }

        bool isUnlocked = chapterUnlock is not null
            && chapterUnlock.PasscodeVersion == chapterAccess.PasscodeVersion;

        return isUnlocked
            ? new ChapterAccessResult(Allowed: true, CanSaveProgress: courseAccess.CanLearn, Reason: "OK")
            : new ChapterAccessResult(Allowed: false, CanSaveProgress: false, Reason: "PASSCODE_REQUIRED");
    }
}
