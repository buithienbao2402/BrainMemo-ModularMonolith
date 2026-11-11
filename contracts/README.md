# Contracts – Quy ước chung

## 1. Nguyên tắc
1. Contract là **interface C#** trong `BrainMemo.<Module>.Contracts` + DTO/Event record. File `.md` này là nguồn chuẩn; code phải khớp.
2. Module chỉ tham chiếu `*.Contracts` của module khác (xem `docs/REPO_STRUCTURE.md` §2).
3. Mọi hàm: `Task<Result<T>>`, tham số cuối `CancellationToken ct` (bỏ qua trong bảng cho gọn). Không ném exception cho lỗi nghiệp vụ; trả `Result.Failure(Error)`.
4. `Error = (string Code, string Message)`. `Code` theo bảng §3; WebApi ánh xạ sang HTTP theo §3.
5. Contract đồng bộ chỉ dùng khi cần kết quả ngay để quyết định nghiệp vụ. Còn lại dùng event.
6. DTO là `record` bất biến, ID là `Guid`, thời gian `DateTimeOffset` UTC. Danh sách phân trang: `Page<T>(Items, Cursor/AfterId)` hoặc `PagedResult<T>(Items, Page, PageSize, Total)`.
7. Event: kế thừa `IntegrationEvent(Guid EventId, DateTimeOffset OccurredAt)`. Bên nhận **idempotent theo EventId**. Event qua Outbox: Course, Learning, Assessment (xem `events.md`); còn lại phát in-process sau commit.
8. Không đưa vào event/log: mật khẩu, token, passcode, đáp án đúng.
9. Thay đổi Contract/event = task loại CONTRACT (có tăng `Contract Version` ở cuối file module, bên nhận được báo qua `docs/handoff`).

## 2. Cổng hạ tầng (BuildingBlocks.Abstractions)

```csharp
public interface IFileStorage {
  Task<PresignedUpload> CreateUploadUrl(string tmpKey, string contentType, long maxBytes, TimeSpan ttl);
  Task<FileHead?> Head(string key);                         // size, contentType
  Task<string> Commit(string tmpKey, string finalKey);      // copy tmp -> final, trả finalKey
  Task<string> CreateDownloadUrl(string key, TimeSpan ttl, string? downloadName = null);
  Task Delete(string key);  Task DeleteByPrefix(string prefix);
}
public interface ILlmClient { Task<LlmResult> GenerateJson(string systemPrompt, string userPrompt, TimeSpan timeout, CancellationToken ct); } // Gemini mặc định; timeout 30s; retry+circuit breaker
public interface IPhoBertClient { Task<ModerationScore> Score(string text, CancellationToken ct); } // timeout 10s
public interface IEmailSender { Task Send(EmailMessage m, CancellationToken ct); }                  // timeout 10s
public interface ISystemSettings { Task<T> Get<T>(string key); Task Set<T>(string key, T value, Guid actor); } // ai.flag_threshold, ai.daily_quota, ai.llm_provider
public interface IEventBus { Task Publish(IntegrationEvent e); }                                     // in-process, sau commit
public interface IClock { DateTimeOffset UtcNow { get; } }
public interface IModerationTransaction {                                                            // DEC-04: chỉ Moderation dùng
  Task<T> RunAsync<T>(Func<IModerationTxContext, Task<T>> work); }                                   // chia sẻ DbConnection/DbTransaction; module đích nhận ExternalTransaction qua tham số ambient
```

Prefix khóa tệp: `tmp/{userId}/{objectId}` → `avatars/{userId}/..`, `courses/{courseId}/cover/..`, `courses/{courseId}/resources/{resourceId}/..`, `submissions/{courseId}/{blockId}/{userId}/..`, `moderation/{reportId}/..`.

## 3. Mã lỗi ↔ HTTP

| Code | HTTP | Ghi chú |
|:--|:-:|:--|
| VALIDATION_FAILED | 422 | kèm `errors[]` |
| MALFORMED_REQUEST | 400 | |
| UNAUTHENTICATED | 401 | thiếu/hết hạn token, hoặc Khách chạm nội dung cần đăng nhập |
| INVALID_CREDENTIALS | 401 | |
| TOKEN_INVALID_OR_EXPIRED | 400 | token email |
| ACCOUNT_LOCKED | 403 | kèm lockedUntil/lockReason |
| EMAIL_NOT_VERIFIED | 403 | tạo khóa, dùng AI |
| FORBIDDEN | 403 | thiếu quyền |
| NOT_ENROLLED | 403 | Private/chưa ghi danh |
| PASSCODE_REQUIRED | 403 | chương Protected |
| NOT_FOUND | 404 | gồm giấu Only Me/Tạm ẩn/Đã xóa |
| EMAIL_TAKEN, DUPLICATE_REPORT, ALREADY_SUBMITTED, ALREADY_HIDDEN, ALREADY_LOCKED, RESOURCE_IN_USE | 409 | |
| VERSION_CONFLICT | 409 | Lưu chương sai `baseVersionNo` |
| INVALID_STATE | 409 | chuyển trạng thái không hợp lệ |
| LAST_ADMIN, SELF_LOCK | 409 | |
| ONLY_ME_NOT_ALLOWED | 409 | |
| CHAPTER_PUBLISH_BLOCKED | 422 | kèm `errors[]` |
| QUIZ_NOT_OPEN, QUIZ_CLOSED, ATTEMPT_LIMIT_REACHED, QUIZ_PASSWORD_INVALID, PREREQUISITE_NOT_MET, NOT_ENOUGH_QUESTIONS, DEADLINE_PASSED | 409 | |
| FILE_TOO_LARGE, FILE_TYPE_NOT_ALLOWED | 422 | |
| RATE_LIMITED, AI_QUOTA_EXCEEDED | 429 | |
| AI_UNAVAILABLE | 503 | |

Ánh xạ `CheckChapterAccess.reason` → lỗi: `COURSE_DENIED`→404 (Only Me/Tạm ẩn/Đã xóa) hoặc 401 nếu Khách chạm khóa Private; `NOT_ENROLLED`→403; `PASSCODE_REQUIRED`→403; `NOT_FOUND`→404.
