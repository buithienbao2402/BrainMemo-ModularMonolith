```csharp
public interface ICourseContract {
  Result<CourseAccessDto> GetCourseAccess(Guid courseId, Guid? viewerUserId, AccessPurpose purpose = AccessPurpose.Normal);
  Result<ChapterAccessResult> CheckChapterAccess(Guid courseId, Guid chapterId, Guid? viewerUserId);
  Result<IReadOnlyList<CourseSummaryDto>> GetCourseSummaries(IReadOnlyList<Guid> courseIds, Guid? viewerUserId); // visible=false khi không xem được, KHÔNG kèm nội dung
  Result<Page<CourseSummaryDto>> ListUserCourses(Guid userId, UserCourseRelation relation, CourseAudience audience, Guid? afterId, int limit);
  Result<ReportTargetDto> ResolveReportTarget(Guid courseId, Guid reporterUserId);   // Only Me → NOT_FOUND
  Result HideCourse(Guid courseId, Guid sanctionId, Guid actorAdminId);              // ONLY_ME_NOT_ALLOWED, ALREADY_HIDDEN, INVALID_STATE, NOT_FOUND
  Result RestoreCourse(Guid courseId, Guid sanctionId, ActorKind actor);             // idempotent; chỉ gỡ khi hidden_sanction_id khớp
  Result<string> PermanentlyDeleteCourse(Guid courseId, Guid actorAdminId);          // trả tên khóa; INVALID_STATE nếu chưa Đã xóa/Tạm ẩn
  Result<Page<Guid>> ListActiveLearnerIds(Guid courseId, Guid? afterId, int limit);
  Result<Page<CourseSnapshotDto>> ListCourseSnapshots(Guid? afterId, int limit);      // chỉ khóa eligible
  Result<Page<EnrollmentFactDto>> ListEnrollmentFacts(DateTimeOffset? after, int limit);
  Result<Page<NominationFactDto>> ListNominationFacts(DateTimeOffset? after, int limit);
}
public enum AccessPurpose { Normal, ModerationReview }   // ModerationReview CHỈ do Moderation truyền (Architecture test)
public enum UserCourseRelation { Owned, EnrolledActive, Completed }
public enum CourseAudience { Self, Public }
public record CourseAccessDto(bool Exists, string EffectiveState /*ACTIVE|HIDDEN|DELETED*/, string AccessMode, Guid OwnerUserId,
  bool IsOwner, string? EnrollmentStatus, bool CanViewInfo, bool CanReadContent, bool CanLearn, string ReasonCode);
public record ChapterAccessResult(bool Allowed, bool CanSaveProgress, string Reason /*OK|COURSE_DENIED|PASSCODE_REQUIRED|NOT_ENROLLED|NOT_FOUND*/);
```
**Quy tắc đánh giá** (thứ tự, theo CSDL 3.5.8.1 + DEC-02): (1) không tồn tại → NOT_FOUND; (2) chủ khóa → cho mọi thao tác chủ khóa (kể cả Tạm ẩn); (3) ONLY_ME → từ chối mọi người khác, **kể cả Admin và ModerationReview**; (3b) `purpose=ModerationReview` → cho đọc chỉ-đọc (`CanReadContent=true`, mọi ghi bị chặn) với Private/Tạm ẩn/Đã xóa/Public; (4) Tạm ẩn/Đã xóa → từ chối người khác; (5) PUBLIC; (6) PRIVATE chỉ ACTIVE vào nội dung; (7) chương PROTECTED cần unlock còn hiệu lực (`passcode_version` khớp). Không cache quyền.
Gọi ra: Identity `GetAccountStatus`; Content `GetChapterInfo`, `CountPublishedChapters`; Learning `GetCourseLearningStats`; Profile `GetDisplayInfo`.
Event phát (Outbox `crs_outbox_event`): `CourseUpserted`, `CoursePermanentlyDeleted`, `EnrollmentChanged`, `NominationChanged`. Tiêu thụ: `ChapterDeleted`, `CourseCompleted`.
Contract Version: 1