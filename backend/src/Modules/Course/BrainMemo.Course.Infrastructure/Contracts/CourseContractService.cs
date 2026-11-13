using BrainMemo.BuildingBlocks.Abstractions.Outbox;
using BrainMemo.BuildingBlocks.Abstractions.Storage;
using BrainMemo.Course.Application.Abstractions;
using BrainMemo.Course.Application.Common;
using BrainMemo.Course.Contracts;
using BrainMemo.Course.Contracts.Dtos;
using BrainMemo.Course.Contracts.Enums;
using BrainMemo.Course.Contracts.Events;
using BrainMemo.Course.Domain.Entities;
using BrainMemo.Course.Domain.Enums;
using BrainMemo.SharedKernel.Pagination;
using BrainMemo.SharedKernel.Results;
using BrainMemo.SharedKernel.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BrainMemo.Course.Infrastructure.Contracts;

public sealed class CourseContractService(
    ICourseRepository courseRepository,
    Persistence.CourseDbContext dbContext,
    IClock clock,
    IOutboxWriter outboxWriter,
    IFileStorage? fileStorage = null,
    ILogger<CourseContractService>? logger = null) : ICourseContract
{
    private static readonly TimeSpan CoverUrlTtl = TimeSpan.FromMinutes(15);

    public Result<CourseAccessDto> GetCourseAccess(
        Guid courseId,
        Guid? viewerUserId,
        AccessPurpose purpose = AccessPurpose.Normal)
    {
        Domain.Entities.Course? course = dbContext.Courses
            .AsNoTracking()
            .FirstOrDefault(c => c.Id == courseId);

        Enrollment? enrollment = null;
        if (viewerUserId.HasValue && course is not null)
        {
            enrollment = dbContext.Enrollments
                .AsNoTracking()
                .FirstOrDefault(e => e.CourseId == courseId && e.UserId == viewerUserId.Value);
        }

        CourseAccessDto dto = CourseAccessEvaluator.EvaluateCourseAccess(
            course,
            viewerUserId,
            enrollment,
            purpose);

        return dto;
    }

    public Result<ChapterAccessResult> CheckChapterAccess(
        Guid courseId,
        Guid chapterId,
        Guid? viewerUserId)
    {
        Result<CourseAccessDto> courseAccessResult = GetCourseAccess(courseId, viewerUserId);
        if (courseAccessResult.IsFailure)
        {
            return new ChapterAccessResult(false, false, "COURSE_DENIED");
        }

        ChapterAccess? chapterAccess = dbContext.ChapterAccesses
            .AsNoTracking()
            .FirstOrDefault(a => a.ChapterId == chapterId);

        ChapterUnlock? chapterUnlock = null;
        if (viewerUserId.HasValue)
        {
            chapterUnlock = dbContext.ChapterUnlocks
                .AsNoTracking()
                .FirstOrDefault(u => u.ChapterId == chapterId && u.UserId == viewerUserId.Value);
        }

        ChapterAccessResult result = CourseAccessEvaluator.EvaluateChapterAccess(
            courseAccessResult.Value,
            chapterAccess,
            chapterUnlock);

        return result;
    }

    public Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(
        IReadOnlyList<Guid> courseIds,
        Guid? viewerUserId)
    {
        if (courseIds.Count == 0)
        {
            return Result.Success<IReadOnlyList<CourseSummaryDto>>([]);
        }

        List<Domain.Entities.Course> courses = dbContext.Courses
            .Include(static c => c.Tags)
            .AsNoTracking()
            .Where(c => courseIds.Contains(c.Id))
            .ToList();

        List<Enrollment> enrollments = viewerUserId.HasValue
            ? dbContext.Enrollments
                .AsNoTracking()
                .Where(e => courseIds.Contains(e.CourseId) && e.UserId == viewerUserId.Value)
                .ToList()
            : [];

        Dictionary<Guid, Enrollment> enrollmentMap = enrollments.ToDictionary(static e => e.CourseId);

        List<CourseSummaryDto> result = new(courses.Count);
        foreach (Domain.Entities.Course course in courses)
        {
            enrollmentMap.TryGetValue(course.Id, out Enrollment? enrollment);
            CourseAccessDto access = CourseAccessEvaluator.EvaluateCourseAccess(course, viewerUserId, enrollment);

            if (access.CanViewInfo)
            {
                result.Add(new CourseSummaryDto(
                    course.Id,
                    course.Name,
                    course.Description,
                    course.CoverStorageKey,
                    course.OwnerUserId,
                    course.AccessMode.ToString().ToUpperInvariant(),
                    course.Status.ToString().ToUpperInvariant(),
                    Visible: true,
                    course.Tags.Select(static t => t.Tag).ToList(),
                    course.CreatedAt,
                    course.UpdatedAt));
            }
            else
            {
                // visible = false khi không xem được, KHÔNG kèm nội dung (contracts/course.md)
                result.Add(new CourseSummaryDto(
                    course.Id,
                    Name: null,
                    Description: null,
                    CoverUrl: null,
                    course.OwnerUserId,
                    course.AccessMode.ToString().ToUpperInvariant(),
                    course.Status.ToString().ToUpperInvariant(),
                    Visible: false,
                    Tags: [],
                    course.CreatedAt,
                    course.UpdatedAt));
            }
        }

        return Result.Success<IReadOnlyList<CourseSummaryDto>>(result);
    }

    public Result<Page<CourseSummaryDto>> ListUserCourses(
        Guid userId,
        UserCourseRelation relation,
        CourseAudience audience,
        Guid? afterId,
        int limit)
    {
        int take = Math.Clamp(limit, 1, 50);

        IQueryable<Domain.Entities.Course> query = dbContext.Courses
            .Include(static c => c.Tags)
            .AsNoTracking();

        if (audience == CourseAudience.Public)
        {
            // Only Me, Hidden, Deleted are strictly prohibited from public audience (FR-PRF-06, DEC-16, D18)
            query = query.Where(c => c.OwnerUserId == userId
                && c.AccessMode == CourseAccessMode.Public
                && c.HiddenAt == null
                && c.DeletedAt == null);
        }
        else
        {
            // Self audience
            if (relation == UserCourseRelation.Owned)
            {
                query = query.Where(c => c.OwnerUserId == userId && c.DeletedAt == null);
            }
            else
            {
                IQueryable<Guid> enrolledIds = dbContext.Enrollments
                    .Where(e => e.UserId == userId && e.Status == EnrollmentStatus.Active)
                    .Select(static e => e.CourseId);

                query = query.Where(c => enrolledIds.Contains(c.Id) && c.DeletedAt == null);
            }
        }

        if (afterId.HasValue)
        {
            query = query.Where(c => c.Id.CompareTo(afterId.Value) > 0);
        }

        int totalCount = query.Count();
        List<Domain.Entities.Course> courses = query
            .OrderBy(static c => c.Id)
            .Take(take)
            .ToList();

        List<CourseSummaryDto> items = courses.Select(static c => new CourseSummaryDto(
            c.Id,
            c.Name,
            c.Description,
            c.CoverStorageKey,
            c.OwnerUserId,
            c.AccessMode.ToString().ToUpperInvariant(),
            c.Status.ToString().ToUpperInvariant(),
            Visible: true,
            c.Tags.Select(static t => t.Tag).ToList(),
            c.CreatedAt,
            c.UpdatedAt)).ToList();

        return new Page<CourseSummaryDto>(items, totalCount, 1, take);
    }

    public Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId)
    {
        Domain.Entities.Course? course = dbContext.Courses
            .AsNoTracking()
            .FirstOrDefault(c => c.Id == courseId);

        if (course is null || course.AccessMode == CourseAccessMode.OnlyMe)
        {
            // Only Me -> NOT_FOUND (contracts/course.md)
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        return new ReportTargetDto(
            course.Id,
            course.OwnerUserId,
            course.Name,
            course.AccessMode.ToString().ToUpperInvariant(),
            course.Status.ToString().ToUpperInvariant());
    }

    public Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        Domain.Entities.Course? course = dbContext.Courses
            .Include(static c => c.Tags)
            .FirstOrDefault(c => c.Id == courseId);

        if (course is null)
        {
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        Result hideResult = course.Hide(sanctionId, utcNow);
        if (hideResult.IsFailure)
        {
            return hideResult.Error;
        }

        CourseUpserted upserted = CourseEventFactory.CreateUpsertedEvent(course, ["hidden_at"], utcNow);
        outboxWriter.WriteAsync("Course", course.Id, upserted).GetAwaiter().GetResult();

        dbContext.SaveChanges();
        return Result.Success();
    }

    public Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor)
    {
        DateTimeOffset utcNow = clock.UtcNow;

        Domain.Entities.Course? course = dbContext.Courses
            .Include(static c => c.Tags)
            .FirstOrDefault(c => c.Id == courseId);

        if (course is null)
        {
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        Result restoreResult = course.Restore(sanctionId);
        if (restoreResult.IsFailure)
        {
            return restoreResult.Error;
        }

        CourseUpserted upserted = CourseEventFactory.CreateUpsertedEvent(course, ["hidden_at"], utcNow);
        outboxWriter.WriteAsync("Course", course.Id, upserted).GetAwaiter().GetResult();

        dbContext.SaveChanges();
        return Result.Success();
    }

    public Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId)
    {
        Domain.Entities.Course? course = dbContext.Courses
            .FirstOrDefault(c => c.Id == courseId);

        if (course is null)
        {
            return Error.NotFound("Không tìm thấy khóa học.");
        }

        if (!course.IsDeleted && !course.IsHidden)
        {
            return new Error("INVALID_STATE", "Khóa học phải ở trạng thái Tạm ẩn hoặc Đã xóa mới có thể xóa vĩnh viễn.");
        }

        string courseName = course.Name;
        string? coverKey = course.CoverStorageKey;

        dbContext.Courses.Remove(course);

        CoursePermanentlyDeleted deletedEvent = new(
            Guid.NewGuid(),
            clock.UtcNow,
            courseId,
            coverKey);

        outboxWriter.WriteAsync("Course", courseId, deletedEvent).GetAwaiter().GetResult();
        dbContext.SaveChanges();

        return Result.Success(courseName);
    }

    public Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit)
    {
        int take = Math.Clamp(limit, 1, 50);

        IQueryable<Enrollment> query = dbContext.Enrollments
            .AsNoTracking()
            .Where(e => e.CourseId == courseId && e.Status == EnrollmentStatus.Active);

        if (afterId.HasValue)
        {
            query = query.Where(e => e.UserId.CompareTo(afterId.Value) > 0);
        }

        int total = query.Count();
        List<Guid> ids = query
            .OrderBy(static e => e.UserId)
            .Take(take)
            .Select(static e => e.UserId)
            .ToList();

        return new Page<Guid>(ids, total, 1, take);
    }

    public Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit)
    {
        int take = Math.Clamp(limit, 1, 50);

        IQueryable<Domain.Entities.Course> query = dbContext.Courses
            .Include(static c => c.Tags)
            .AsNoTracking()
            .Where(static c => (c.AccessMode == CourseAccessMode.Public || c.AccessMode == CourseAccessMode.Private)
                && c.HiddenAt == null
                && c.DeletedAt == null);

        if (afterId.HasValue)
        {
            query = query.Where(c => c.Id.CompareTo(afterId.Value) > 0);
        }

        int total = query.Count();
        List<Domain.Entities.Course> courses = query
            .OrderBy(static c => c.Id)
            .Take(take)
            .ToList();

        List<CourseSnapshotDto> items = courses.Select(static c => new CourseSnapshotDto(
            c.Id,
            c.OwnerUserId,
            c.Name,
            c.Description,
            c.CoverStorageKey,
            c.AccessMode.ToString().ToUpperInvariant(),
            c.Status.ToString().ToUpperInvariant(),
            c.Tags.Select(static t => t.Tag).ToList(),
            c.CreatedAt,
            c.UpdatedAt,
            c.Revision)).ToList();

        return new Page<CourseSnapshotDto>(items, total, 1, take);
    }

    public Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit)
    {
        int take = Math.Clamp(limit, 1, 50);

        IQueryable<Enrollment> query = dbContext.Enrollments
            .AsNoTracking()
            .Where(static e => e.Status == EnrollmentStatus.Active && e.FirstEnrolledAt != null);

        if (after.HasValue)
        {
            query = query.Where(e => e.FirstEnrolledAt > after.Value);
        }

        int total = query.Count();
        List<EnrollmentFactDto> facts = query
            .OrderBy(static e => e.FirstEnrolledAt)
            .Take(take)
            .Select(static e => new EnrollmentFactDto(e.CourseId, e.UserId, e.FirstEnrolledAt!.Value))
            .ToList();

        return new Page<EnrollmentFactDto>(facts, total, 1, take);
    }

    public Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit)
    {
        int take = Math.Clamp(limit, 1, 50);

        IQueryable<Nomination> query = dbContext.Nominations.AsNoTracking();

        if (after.HasValue)
        {
            query = query.Where(n => n.NominatedAt > after.Value);
        }

        int total = query.Count();
        List<NominationFactDto> facts = query
            .OrderBy(static n => n.NominatedAt)
            .Take(take)
            .Select(static n => new NominationFactDto(
                n.CourseId,
                n.UserId,
                n.WithdrawnAt == null ? "NOMINATED" : "WITHDRAWN",
                n.WithdrawnAt ?? n.NominatedAt))
            .ToList();

        return new Page<NominationFactDto>(facts, total, 1, take);
    }
}
