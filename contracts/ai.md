```csharp
public interface IAiContract { Result<DailyQuotaDto> GetDailyQuota(Guid userId); }  // (used, limit, remaining)
```
Luồng job (DEC-07): `POST` tạo `ai_generation_job` PENDING + trừ quota bằng cập nhật có điều kiện (`used_count < quota_limit`) → worker nền gọi `ILlmClient` (30s) → `Content.Import*` → job COMPLETED/FAILED. Quét vi phạm: nhận `CommentCreated` và `CourseUpserted` (eligible=true, changedFields chứa name/description) → `IPhoBertClient` (10s) → ghi `ai_moderation_scan_log` → nếu `score ≥ ai.flag_threshold` gọi `Moderation.SubmitAiFlag`. Lỗi PhoBERT: ghi log, bỏ qua. Không quét ONLY_ME.
Event phát: `AIFlagRaised` (chỉ audit). Tiêu thụ: `CommentCreated`, `CourseUpserted`, `CoursePermanentlyDeleted`.
Contract Version: 1