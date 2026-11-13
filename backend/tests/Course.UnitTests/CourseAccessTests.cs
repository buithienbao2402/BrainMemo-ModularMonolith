using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Results;
using Xunit;
using CourseEntity = BrainMemo.Course.Domain.Entities.Course;
using EnrollmentStatus = BrainMemo.Course.Domain.Enums.EnrollmentStatus;
using ChapterAccessMode = BrainMemo.Course.Domain.Enums.ChapterAccessMode;
using CourseStatus = BrainMemo.Course.Domain.Enums.CourseStatus;

namespace Course.UnitTests;

public sealed class CourseAccessTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private static readonly Guid OwnerId = Guid.NewGuid();
    private static readonly Guid OtherUserId = Guid.NewGuid();

    [Fact]
    public void EvaluateCourseAccess_WhenCourseDoesNotExist_ReturnsNotFound()
    {
        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(null, OtherUserId, null);

        Assert.False(access.Exists);
        Assert.Equal("NOT_FOUND", access.EffectiveState);
        Assert.False(access.CanViewInfo);
        Assert.False(access.CanReadContent);
        Assert.False(access.CanLearn);
        Assert.Equal("NOT_FOUND", access.ReasonCode);
    }

    [Theory]
    [InlineData(CourseAccessMode.Public, false, false)]
    [InlineData(CourseAccessMode.Private, false, false)]
    [InlineData(CourseAccessMode.OnlyMe, false, false)]
    [InlineData(CourseAccessMode.Public, true, false)]  // Hidden
    [InlineData(CourseAccessMode.Public, false, true)]  // Soft deleted
    [InlineData(CourseAccessMode.Private, true, false)] // Hidden
    [InlineData(CourseAccessMode.Private, false, true)] // Soft deleted
    public void EvaluateCourseAccess_Owner_AlwaysHasFullAccess(
        CourseAccessMode accessMode,
        bool isHidden,
        bool isDeleted)
    {
        CourseEntity course = CreateCourse(accessMode, isHidden, isDeleted);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, OwnerId, null);

        Assert.True(access.Exists);
        Assert.True(access.IsOwner);
        Assert.True(access.CanViewInfo);
        Assert.True(access.CanReadContent);
        Assert.True(access.CanLearn);
        Assert.Equal("OWNER", access.ReasonCode);
    }

    [Theory]
    [InlineData(false, AccessPurpose.Normal)]
    [InlineData(true, AccessPurpose.ModerationReview)]
    public void EvaluateCourseAccess_OnlyMe_DeniedToEveryoneElse_EvenModerationReview(
        bool hasViewer,
        AccessPurpose purpose)
    {
        CourseEntity course = CreateCourse(CourseAccessMode.OnlyMe, false, false);
        Guid? viewer = hasViewer ? OtherUserId : null;

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, viewer, null, purpose);

        Assert.True(access.Exists);
        Assert.False(access.IsOwner);
        Assert.False(access.CanViewInfo);
        Assert.False(access.CanReadContent);
        Assert.False(access.CanLearn);
        Assert.Equal("ONLY_ME", access.ReasonCode);
    }

    [Theory]
    [InlineData(CourseAccessMode.Public, false, false)]
    [InlineData(CourseAccessMode.Private, false, false)]
    [InlineData(CourseAccessMode.Public, true, false)]  // Hidden
    [InlineData(CourseAccessMode.Public, false, true)]  // Deleted
    [InlineData(CourseAccessMode.Private, true, false)] // Hidden
    [InlineData(CourseAccessMode.Private, false, true)] // Deleted
    public void EvaluateCourseAccess_ModerationReview_AllowsReadOnly_ForNonOnlyMeCourses(
        CourseAccessMode mode,
        bool isHidden,
        bool isDeleted)
    {
        CourseEntity course = CreateCourse(mode, isHidden, isDeleted);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(
            course,
            OtherUserId,
            null,
            AccessPurpose.ModerationReview);

        Assert.True(access.Exists);
        Assert.False(access.IsOwner);
        Assert.True(access.CanViewInfo);
        Assert.True(access.CanReadContent);  // Read-only access per DEC-02
        Assert.False(access.CanLearn);       // Cannot learn / write progress
        Assert.Equal("MODERATION_REVIEW", access.ReasonCode);
    }

    [Theory]
    [InlineData(true, false)] // Hidden
    [InlineData(false, true)] // Deleted
    public void EvaluateCourseAccess_HiddenOrDeleted_DeniedToNonOwnersUnderNormalPurpose(
        bool isHidden,
        bool isDeleted)
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Public, isHidden, isDeleted);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(
            course,
            OtherUserId,
            null,
            AccessPurpose.Normal);

        Assert.True(access.Exists);
        Assert.False(access.IsOwner);
        Assert.False(access.CanViewInfo);
        Assert.False(access.CanReadContent);
        Assert.False(access.CanLearn);
        Assert.Equal(isDeleted ? "COURSE_DELETED" : "COURSE_HIDDEN", access.ReasonCode);
    }

    [Fact]
    public void EvaluateCourseAccess_Public_AuthenticatedUser_CanReadAndLearn()
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Public, false, false);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, OtherUserId, null);

        Assert.True(access.CanViewInfo);
        Assert.True(access.CanReadContent);
        Assert.True(access.CanLearn);
        Assert.Equal("PUBLIC_ACCESS", access.ReasonCode);
    }

    [Fact]
    public void EvaluateCourseAccess_Public_AnonymousGuest_CanReadButNotLearn()
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Public, false, false);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, null, null);

        Assert.True(access.CanViewInfo);
        Assert.True(access.CanReadContent);
        Assert.False(access.CanLearn); // Guest cannot save progress
        Assert.Equal("PUBLIC_ACCESS", access.ReasonCode);
    }

    [Fact]
    public void EvaluateCourseAccess_Private_ActiveLearner_CanReadAndLearn()
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Private, false, false);
        Enrollment enrollment = new(Guid.NewGuid(), course.Id, OtherUserId, EnrollmentStatus.Active, Now, Now);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, OtherUserId, enrollment);

        Assert.True(access.CanViewInfo);
        Assert.True(access.CanReadContent);
        Assert.True(access.CanLearn);
        Assert.Equal("ENROLLED", access.ReasonCode);
    }

    [Theory]
    [InlineData(EnrollmentStatus.PendingApproval)]
    [InlineData(EnrollmentStatus.Invited)]
    [InlineData(EnrollmentStatus.Left)]
    [InlineData(EnrollmentStatus.Removed)]
    public void EvaluateCourseAccess_Private_NonActiveEnrollment_CannotReadOrLearn(EnrollmentStatus status)
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Private, false, false);
        Enrollment enrollment = new(Guid.NewGuid(), course.Id, OtherUserId, status, null, Now);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, OtherUserId, enrollment);

        Assert.True(access.CanViewInfo);
        Assert.False(access.CanReadContent);
        Assert.False(access.CanLearn);
        Assert.Equal("ENROLLMENT_REQUIRED", access.ReasonCode);
    }

    [Fact]
    public void EvaluateCourseAccess_Private_NoEnrollment_CannotReadOrLearn()
    {
        CourseEntity course = CreateCourse(CourseAccessMode.Private, false, false);

        CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, OtherUserId, null);

        Assert.True(access.CanViewInfo);
        Assert.False(access.CanReadContent);
        Assert.False(access.CanLearn);
        Assert.Equal("ENROLLMENT_REQUIRED", access.ReasonCode);
    }

    [Fact]
    public void EvaluateChapterAccess_WhenCourseDenied_ReturnsCourseDenied()
    {
        CourseAccessDto deniedCourseAccess = new(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PRIVATE",
            OwnerUserId: OwnerId,
            IsOwner: false,
            EnrollmentStatus: null,
            CanViewInfo: true,
            CanReadContent: false,
            CanLearn: false,
            ReasonCode: "ENROLLMENT_REQUIRED");

        ChapterAccessResult result = CourseAccessEvaluator.EvaluateChapterAccess(null, deniedCourseAccess, null);

        Assert.False(result.Allowed);
        Assert.False(result.CanSaveProgress);
        Assert.Equal("COURSE_DENIED", result.Reason);
    }

    [Fact]
    public void EvaluateChapterAccess_ProtectedChapter_RequiresMatchingPasscodeVersion()
    {
        Guid chapterId = Guid.NewGuid();
        Guid courseId = Guid.NewGuid();
        ChapterAccess protectedAccess = new(chapterId, courseId, ChapterAccessMode.Protected, "hash123", 2, Now);

        CourseAccessDto courseAccess = new(
            Exists: true,
            EffectiveState: "ACTIVE",
            AccessMode: "PUBLIC",
            OwnerUserId: OwnerId,
            IsOwner: false,
            EnrollmentStatus: null,
            CanViewInfo: true,
            CanReadContent: true,
            CanLearn: true,
            ReasonCode: "PUBLIC_ACCESS");

        // Case 1: No unlock record -> PASSCODE_REQUIRED
        ChapterAccessResult noUnlockResult = CourseAccessEvaluator.EvaluateChapterAccess(protectedAccess, courseAccess, null);
        Assert.False(noUnlockResult.Allowed);
        Assert.Equal("PASSCODE_REQUIRED", noUnlockResult.Reason);

        // Case 2: Outdated unlock (version 1 vs chapter version 2) -> PASSCODE_REQUIRED
        ChapterUnlock oldUnlock = new(chapterId, OtherUserId, 1, Now);
        ChapterAccessResult oldUnlockResult = CourseAccessEvaluator.EvaluateChapterAccess(protectedAccess, courseAccess, oldUnlock);
        Assert.False(oldUnlockResult.Allowed);
        Assert.Equal("PASSCODE_REQUIRED", oldUnlockResult.Reason);

        // Case 3: Matching unlock (version 2) -> Allowed
        ChapterUnlock currentUnlock = new(chapterId, OtherUserId, 2, Now);
        ChapterAccessResult successResult = CourseAccessEvaluator.EvaluateChapterAccess(protectedAccess, courseAccess, currentUnlock);
        Assert.True(successResult.Allowed);
        Assert.True(successResult.CanSaveProgress);
        Assert.Equal("OK", successResult.Reason);
    }

    private static CourseEntity CreateCourse(CourseAccessMode accessMode, bool isHidden, bool isDeleted)
    {
        Result<CourseEntity> result = CourseEntity.Create(
            Guid.NewGuid(),
            OwnerId,
            "Test Course",
            "Test Description",
            null,
            accessMode,
            CourseStatus.Updating,
            ["tag1"],
            Now);

        CourseEntity course = result.Value;
        if (isHidden)
        {
            course.Hide(Guid.NewGuid(), Now);
        }

        if (isDeleted)
        {
            course.SoftDelete(Now);
        }

        return course;
    }
}
