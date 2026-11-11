```csharp
public interface IModerationContract {
  Result<Guid> SubmitAiFlag(Guid aiFindingId, ReportTargetType targetType, Guid targetId, Guid targetCourseId, Guid targetOwnerUserId,
                            string reasonCode, string contentSnapshot, decimal score);   // idempotent theo ai_finding_id; KHÔNG áp chế tài
}
```
Luồng `Resolve` (một transaction, `IModerationTransaction`): cập nhật `mod_report` (WHERE status='PENDING') → chèn `mod_sanction` → gọi Identity/Course/Learning → chèn `mod_audit_log` → COMMIT → phát `ReportResolved`. Contract từ chối → rollback toàn bộ.
Xem nội dung (DEC-02): Moderation xác nhận tồn tại báo cáo trỏ tới khóa, rồi gọi `Course.GetCourseAccess(purpose=ModerationReview)`.
Gọi ra: Identity `IsAdmin/LockAccount/UnlockAccount/IsLastAdmin`; Course `ResolveReportTarget/HideCourse/RestoreCourse/PermanentlyDeleteCourse/GetCourseAccess`; Learning `ResolveReportTarget/SoftDeleteComment/RestoreComment`.
Event phát (không Outbox): `ReportResolved`, `SanctionApplied` (chỉ chế tài trực tiếp). Tiêu thụ: `AccountUnlocked(AUTO_EXPIRED)`. Job nền: hết hạn Tạm ẩn → `RestoreCourse(actor=System)`.
Contract Version: 1