# Handoff Note – T-S4-BE-02

## 1. Thông tin task
- **Task ID:** `T-S4-BE-02` (Gốc `BE-03`)
- **Mô tả:** Learning Progress & Player Service:
  - Đọc chương (`readChapter` / `GET /api/v1/courses/{courseId}/learn/chapters/{chapterId}`): Đọc bản đã đăng tải, KHÔNG kèm đáp án. Kiểm tra `CheckChapterAccess`. 403 PASSCODE_REQUIRED/NOT_ENROLLED, 401 (Khách), 404 giấu. `canSaveProgress=false` với Khách/chưa ghi danh;
  - Đánh dấu hoàn thành Block (`completeBlock` / `POST /api/v1/courses/{courseId}/blocks/{blockId}/complete`): Idempotent (FR-LRN-03). Chỉ ghi được khi `canSaveProgress=true`. Lưu `lrn_block_completion`. Phát event `BlockCompleted`, kiểm tra hoàn thành chương phát `ChapterCompleted`, hoàn thành 100% khóa học lưu `lrn_course_completion` và phát `CourseCompleted` đúng 1 lần;
  - Trả lời câu hỏi thực hành Block QUESTION (`answerPracticeQuestion` / `POST /api/v1/courses/{courseId}/blocks/{blockId}/practice-answer`): Khách không lưu; đang học ghi hoàn thành block;
  - Lấy tiến độ khóa học (`getCourseProgress` / `GET /api/v1/courses/{courseId}/progress`): Trả về `ProgressDto` (percent, completedChapterIds, chapters with percent, completedBlockIds, lastActivityAt, courseCompletedAt);
  - Hệ thống Bookmark (`setBookmark` / `PUT /api/v1/courses/{courseId}/bookmark`, `removeBookmark` / `DELETE`, `listMyBookmarks` / `GET /api/v1/me/bookmarks`): 1 bookmark/khóa trong `lrn_bookmark`;
  - Thống kê học tập (`GET /api/v1/courses/{courseId}/enrollments/summary`) và Thống kê hoàn thành chương (`GET /api/v1/courses/{courseId}/chapters/{chapterId}/progress-summary`);
  - Triển khai `ILearningContract` và `LearningModule` tích hợp vào Host `BrainMemo.WebApi`.
- **Nhánh Git:** `dev/kim-thuan`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** DONE (100% Learning unit tests passed, build solution 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. Động cơ Tiến độ Học tập & Trình đọc Chương (FR-LRN-01, 02, 03, 15, 16)
1. **Đọc chương (`readChapter`):**
   - Kiểm tra quyền truy cập qua `ICourseContract.CheckChapterAccess`.
   - Khách vãng lai đối với khóa học / chương `PUBLIC`: Đọc được nội dung nhưng `canSaveProgress = false`, không hiển thị trạng thái hoàn thành.
   - Khách vãng lai đối với khóa `PRIVATE`: Bị từ chối 401 `UNAUTHENTICATED`.
   - Người dùng chưa ghi danh vào khóa `PRIVATE`: Bị từ chối 403 `NOT_ENROLLED`.
   - Chương `PROTECTED` chưa mở khóa bằng passcode: Bị từ chối 403 `PASSCODE_REQUIRED`.
   - Lấy nội dung đăng tải qua `IContentContract.GetPublishedChapterContent` và loại bỏ đáp án.
   - Gắn cờ `completed = true` cho các block mà học viên đã hoàn thành.

2. **Hoàn thành Block (`completeBlock`):**
   - Xác thực người dùng đăng nhập và kiểm tra `CanSaveProgress`.
   - Ghi nhận vào `lrn_block_completion` (`id`, `user_id`, `course_id`, `chapter_id`, `block_id`, `block_type`, `completed_at`).
   - Idempotent: Nếu đã hoàn thành trước đó, trả về tiến độ hiện tại mà không báo lỗi hay phát sự kiện trùng.
   - Phát sự kiện `BlockCompleted`.
   - Khi tất cả block đã đăng tải của chương hoàn thành: Phát sự kiện `ChapterCompleted`.
   - Khi 100% chương đã đăng tải của khóa học hoàn thành:
     - Ghi nhận vào `lrn_course_completion`.
     - Phát sự kiện `CourseCompleted` đúng 1 lần.
     - Thời điểm hoàn thành khóa học được bảo lưu vĩnh viễn và không bị hủy khi chủ khóa thêm chương/block mới (chỉ giảm tỷ lệ phần trăm hiển thị).

3. **Thực hành câu hỏi (`answerPracticeQuestion`):**
   - Gọi `IContentContract.EvaluatePracticeAnswer` để chấm điểm / kiểm tra đúng sai.
   - Tự động hoàn thành block câu hỏi cho học viên đang học.

4. **Quản lý Bookmark:**
   - Đặt bookmark: `PUT /api/v1/courses/{courseId}/bookmark` (1 bookmark duy nhất / khóa, cập nhật `chapterId` và `updatedAt`).
   - Xóa bookmark: `DELETE /api/v1/courses/{courseId}/bookmark`.
   - Danh sách bookmark cá nhân: `GET /api/v1/me/bookmarks`.

5. **Thống kê Tiến độ & Ghi danh:**
   - `GET /api/v1/courses/{courseId}/chapters/{chapterId}/progress-summary`: Số học viên hoàn thành chương và tỷ lệ hoàn thành.
   - `GET /api/v1/courses/{courseId}/enrollments/summary`: Tổng số học viên, học viên đang học, học viên đã hoàn thành khóa.

---

## 3. Kết quả Kiểm thử
- **Build Solution:** 44 dự án build thành công, 0 warning, 0 error.
- **Learning.UnitTests:** 6/6 tests passed 100%.
  - `ReadChapter_WhenGuestAccessPublicChapter_ReturnsBlocksWithoutSavingProgress`: Pass.
  - `ReadChapter_WhenGuestHitsPrivateCourse_ReturnsUnauthenticated`: Pass.
  - `ReadChapter_WhenUnenrolledLearner_ReturnsNotEnrolledError`: Pass.
  - `CompleteBlock_WhenEnrolledActive_CompletesBlockAndCalculatesProgress`: Pass.
  - `CompleteBlock_WhenGuest_ReturnsForbidden`: Pass.
  - `Bookmark_SetRemoveList_WorksCorrectly`: Pass.

---

## 4. Ghi chú cho FE & INT
- Header `Authorization: Bearer <token>` là bắt buộc cho các endpoint ghi nhận tiến độ, bookmark và thống kê.
- Endpoint đọc chương `/courses/{courseId}/learn/chapters/{chapterId}` cho phép cả khách và người dùng đăng nhập.
- Mã lỗi trả về:
  - `NOT_ENROLLED` (403)
  - `PASSCODE_REQUIRED` (403)
  - `UNAUTHENTICATED` (401)
  - `NOT_FOUND` (404)
