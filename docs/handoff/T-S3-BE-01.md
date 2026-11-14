# Handoff Note – T-S3-BE-01

## 1. Thông tin task
- **Task ID:** `T-S3-BE-01` (Batched từ `BE-01 + BE-02`)
- **Mô tả:** Content Domain, Resource Library & Drafting (Batched): Domain + EF Core Migration 15 bảng `cnt_*` (không outbox per ADR-02); Quản lý tài nguyên khóa học: commit `uploadKey` qua S3/R2 storage, whitelist MIME & kích thước (DEC-05: Ảnh ≤ 5 MB, Tệp ≤ 20 MB), xóa mềm (trả 409 `RESOURCE_IN_USE` nếu đang có Block sử dụng), presigned download GET (TTL 15 phút, DEC-06); CRUD chương (`cnt_chapter`), sắp xếp thứ tự (`reorder`), lấy mục lục; Lưu nháp (`PUT /courses/{id}/chapters/{chapterId}`): Khóa lạc quan (`baseVersionNo`), trả 409 `VERSION_CONFLICT` nếu xung đột; 7 loại Block (`RICH_TEXT`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `MARKDOWN`, `FLASHCARD`, `QUESTION`, `ASSIGNMENT`, `QUIZ`); làm sạch HTML (`HtmlSanitizer`) chống XSS; tạo JSON snapshot (`schemaVersion=1`) bất biến chỉ chứa `questionId` (tuyệt đối KHÔNG chứa đáp án/options); Khung dịch vụ `IContentContract`.
- **Nhánh Git:** `feat/T-S3-BE-01-content-drafting`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** REVIEW (Đồng bộ toàn diện với develop, 61/61 tests pass, build 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. Cấu trúc Dự án & Domain Persistence
1. **5 Dự án Module Content:**
   - `BrainMemo.Content.Contracts`: Giao diện hợp đồng `IContentContract` (19 phương thức), DTOs, Enums, Integration Events (`ChapterPublished`, `ChapterDeleted`).
   - `BrainMemo.Content.Domain`: 15 Thực thể cốt lõi: `Chapter`, `ChapterVersion`, `Resource`, `QuestionBank`, `Question`, `QuestionOption`, `QuestionTag`, `Block`, `PublishedBlock`, `QuizConfig`, `QuizQuestion`, `QuizRandomRule`, `QuizPrerequisite`, `QuizException`, `AssignmentConfig`.
   - `BrainMemo.Content.Application`: Abstractions `IContentRepository`, `IHtmlSanitizer`, Commands & Queries CQRS (Chapters & Resources).
   - `BrainMemo.Content.Infrastructure`: DbContext `ContentDbContext` (không Outbox per ADR-02 / 3.6.8, hỗ trợ chuẩn hóa `binary(16)` big-endian RFC 4122 qua `BigEndianGuidBytesConverter` và `NullableBigEndianGuidBytesConverter` đồng bộ theo PR #17), EF Core Configurations cho 15 bảng `cnt_*`, Repository `ContentRepository`, Contract Service `ContentContractService`, Migrations `InitialContent`.
   - `BrainMemo.Course.Contracts`: Chuẩn hóa `AccessPurpose` (`Normal = 0`, `ModerationReview = 1`) theo đúng `contracts/course.md` và luật kiểm tra kiến trúc Rule 9.
   - `BrainMemo.Content.Api`: Controllers `ChaptersController`, `ResourcesController`, DTOs.
2. **Migration Database (`cnt_*`):**
   - Đã sinh EF Core Migration `20261113000003_InitialContent` và ModelSnapshot tương ứng theo schema chuẩn MySQL 8 (15 bảng `cnt_*`, charset utf8mb4).

### 2.2. Quản lý Tài nguyên Khóa học (DEC-05, DEC-06, FR-CNT-18)
1. **`POST /api/v1/courses/{courseId}/resources` (`createResource`):**
   - Chỉ cho phép chủ khóa học (`FORBIDDEN` nếu người khác).
   - Kiểm tra tệp tạm từ MinIO/R2 storage qua `IFileStorage.Head`.
   - Kiểm tra tính hợp lệ qua `FileUploadPolicy.ValidateCommittedObject`:
     - Phân loại tài nguyên (`IMAGE`, `PDF`, `VIDEO`, `AUDIO`, `ARCHIVE`, `OTHER`).
     - Ảnh ≤ 5 MB (5,242,880 bytes).
     - Tệp tài liệu / media ≤ 20 MB (20,971,520 bytes).
     - Từ chối định dạng cấm (`.exe`, v.v.) bằng mã 422 (`FILE_TYPE_NOT_ALLOWED`).
   - Di chuyển và commit tệp sang đường dẫn cố định: `courses/{courseId}/resources/{id}.{ext}`.
2. **`DELETE /api/v1/courses/{courseId}/resources/{id}` (`deleteResource`):**
   - Chỉ chủ khóa học mới có quyền xóa.
   - Kiểm tra `IsResourceInUseAsync`: Chặn xóa mềm và trả 409 `RESOURCE_IN_USE` nếu đang có ít nhất một Block trong khóa học tham chiếu đến tài nguyên này.
   - Nếu không còn Block nào sử dụng: xóa mềm (`deleted_at`).
3. **`GET /api/v1/courses/{courseId}/resources` (`listResources`):**
   - Trả danh sách tài nguyên chưa xóa mềm thuộc khóa học (dành cho chủ khóa).
4. **`GET /api/v1/courses/{courseId}/resources/{id}/download-url` (`getResourceDownloadUrl`):**
   - Xác thực quyền truy cập qua `ICourseContract.GetCourseAccess`.
   - Sinh Presigned GET download URL với TTL 15 phút (900 giây) theo DEC-06.

### 2.3. Quản lý Chương & Lưu Nháp Khóa Lạc Quan (FR-CNT-01, FR-CNT-03, FR-CNT-16)
1. **`GET /api/v1/courses/{courseId}/chapters` (`listChapters`):**
   - Hỗ trợ cả khách vãng lai và người đăng nhập.
   - Chủ sở hữu khóa học: Nhìn thấy toàn bộ chương (cả Draft và Published), kèm cờ `hasUnpublishedChanges = true` nếu bản nháp có sửa đổi chưa đăng tải.
   - Người ngoài: Chỉ nhìn thấy các chương đã đăng tải (`PUBLISHED`).
2. **`POST /api/v1/courses/{courseId}/chapters` (`createChapter`):**
   - Chỉ chủ khóa mới có quyền tạo chương.
   - Tự động gán vị trí tuần tự tiếp theo (`position = maxPosition + 1`).
   - Khởi tạo trạng thái `DRAFT`, `last_version_no = 1`, tạo bản ghi snapshot ban đầu tại `cnt_chapter_version` (v1).
3. **`PUT /api/v1/courses/{courseId}/chapters/order` (`reorderChapters`):**
   - Cho phép chủ khóa sắp xếp lại thứ tự các chương 1..N.
4. **`GET /api/v1/courses/{courseId}/chapters/{chapterId}` (`getChapterDraft`):**
   - Lấy bản làm việc (working draft) kèm đầy đủ các khối nội dung và cấu hình quiz/assignment. Chỉ chủ khóa mới có quyền truy cập.
5. **`PUT /api/v1/courses/{courseId}/chapters/{chapterId}` (`saveChapterDraft`):**
   - **Khóa lạc quan (Optimistic Locking):** So sánh `baseVersionNo` gửi lên từ client với `chapter.LastVersionNo`. Nếu không khớp, lập tức từ chối và trả về HTTP 409 `VERSION_CONFLICT` với thông điệp tiếng Việt chuẩn.
   - **Kiểm tra hợp lệ Block:** Hỗ trợ đầy đủ 7 loại Block cơ bản + Question/Quiz/Assignment:
     - `RICH_TEXT`, `MARKDOWN`: Yêu cầu có `body`.
     - `IMAGE`, `VIDEO`, `AUDIO`, `FILE`: Yêu cầu `resourceId` hợp lệ thuộc khóa học.
     - `FLASHCARD`: Yêu cầu danh sách thẻ không rỗng.
     - `QUESTION`: Yêu cầu `questionId` hợp lệ.
     - `QUIZ`, `ASSIGNMENT`: Yêu cầu có `title`.
   - **Làm sạch HTML (`HtmlSanitizer`):** Loại bỏ toàn bộ thẻ nguy hiểm (`<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`, `<form>`), các thuộc tính xử lý sự kiện (`onload`, `onerror`, `onclick`), và giao thức `javascript:` để ngăn chặn triệt để lỗ hổng XSS.
   - **Bảo mật Snapshot Đề Thi:** Tạo chuỗi JSON snapshot (`schemaVersion = 1`) bất biến cho phiên bản làm việc. Với bài kiểm tra (Quiz), snapshot **tuyệt đối chỉ lưu `questionId`** và điểm số, **không chứa đáp án, options hay cờ `isCorrect`** để ngăn chặn rò rỉ đề thi qua snapshot.
   - Thay thế toàn bộ khối nội dung làm việc (`cnt_block`) và chèn phiên bản lịch sử mới vào `cnt_chapter_version`, đồng thời tăng `last_version_no`.
6. **`DELETE /api/v1/courses/{courseId}/chapters/{chapterId}` (`deleteChapter`):**
   - Xóa mềm chương (`deleted_at`).

### 2.4. Dịch vụ Hợp đồng Nội bộ `IContentContract`
Triển khai `ContentContractService` cung cấp:
- `AuthorizeResourceDownload`: Kiểm tra quyền tải tài nguyên dựa trên quyền học tập của học viên hoặc chủ khóa qua `ICourseContract`.
- `GetChapterInfo`: Tra cứu thông tin metadata chương.
- `ListPublishedChapters` & `CountPublishedChapters`: Tra cứu danh sách và đếm số chương đã đăng tải của khóa học cho Learning module.

---

## 3. Bộ Kiểm thử Đơn vị (`Content.UnitTests`)
Toàn bộ **61/61 kiểm thử** vượt qua 100%:
1. `HtmlSanitizerTests`: 6 tests kiểm tra làm sạch script tags, event handlers, javascript schemes, dangerous iframe/object/embed/form tags, giữ nguyên định dạng an toàn.
2. `ChapterDraftTests`: 15 tests kiểm tra tạo chương tuần tự, sắp xếp lại chương, xóa mềm, lưu nháp với khóa lạc quan thành công, chặn xung đột 409 `VERSION_CONFLICT`, bảo mật snapshot đề thi không có options, làm sạch HTML trong block body, validate từng loại block, phân quyền xem mục lục chủ khóa vs học viên.
3. `ResourceManagementTests`: 12 tests kiểm tra giới hạn ảnh 5 MB (DEC-05), giới hạn tệp 20 MB (DEC-05), chặn định dạng không thuộc whitelist (422 `FILE_TYPE_NOT_ALLOWED`), xóa mềm tài nguyên, chặn xóa tài nguyên đang được block sử dụng (409 `RESOURCE_IN_USE`), tạo presigned download URL TTL 15 phút (DEC-06), phân quyền truy cập.
4. `ContentContractTests`: 8 tests kiểm tra `AuthorizeResourceDownload` cho chủ khóa, học viên ghi danh, chặn người ngoài, tra cứu `GetChapterInfo`, lọc `ListPublishedChapters`, đếm `CountPublishedChapters`.
5. `ContentDomainTests`: 8 tests kiểm tra domain logic `Chapter`, `ChapterVersion`, `Resource`, `Block`.

---

## 4. Hướng dẫn Bước tiếp theo cho Task sau
- **Task tiếp theo:** `T-S3-BE-02` (Publishing, Version History & Contracts).
- Triển khai đăng tải chương `POST /courses/{courseId}/chapters/{chapterId}/publish`, kiểm tra điều kiện tiên quyết (báo `CHAPTER_PUBLISH_BLOCKED`), phát outbox event `ChapterPublished`, xem lịch sử các phiên bản `GET /versions`, khôi phục bản nháp từ phiên bản cũ `POST /versions/{versionNo}/restore`.
