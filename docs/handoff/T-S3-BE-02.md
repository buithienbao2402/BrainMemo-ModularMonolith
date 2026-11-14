# Handoff Note – T-S3-BE-02

## 1. Thông tin task
- **Task ID:** `T-S3-BE-02` (Batched từ `BE-03`)
- **Mô tả:** Publishing, Version History & Contracts (Batched):
  - Đăng tải chương trọn gói (`POST /api/v1/courses/{courseId}/chapters/{chapterId}/publish`): Kiểm tra điều kiện nghiêm ngặt theo mục 3.6.6.3 (chặn 422 `CHAPTER_PUBLISH_BLOCKED` nếu còn thẻ ghi nhớ flashcard AI `PENDING`, tài nguyên bị xóa, câu hỏi không tồn tại, hoặc quiz cấu hình thời gian sai / thiếu câu hỏi `READY` trong ngân hàng). Cho phép đăng tải chương rỗng (0 block). Sinh / tái tạo dữ liệu bảng chỉ mục `cnt_published_block` nguyên khối cùng transaction.
  - Lịch sử phiên bản (`GET /api/v1/courses/{courseId}/chapters/{chapterId}/versions`): Trả danh sách phiên bản snapshot `ChapterVersionDto` phân trang theo thứ tự giảm dần của `version_no`.
  - Khôi phục bản nháp từ lịch sử (`POST /api/v1/courses/{courseId}/chapters/{chapterId}/versions/{versionNo}/restore`): Kiểm tra toàn vẹn tham chiếu (chặn `RESTORE_BLOCKED` nếu tài nguyên đã bị xóa hoặc câu hỏi không còn tồn tại); ghi đè bản nháp làm việc (`cnt_block`), tăng `last_version_no` và tạo bản ghi phiên bản mới với `restored_from_version_no = versionNo`. Không làm ảnh hưởng đến bản đã xuất bản `cnt_published_block` hay trạng thái chương (§3.6.6.1).
  - Xóa chương (`DELETE /api/v1/courses/{courseId}/chapters/{chapterId}`): Cập nhật xóa các khối đã xuất bản `cnt_published_block`, phát sự kiện `ChapterDeleted` qua `IEventBus`.
  - Sự kiện tích hợp: Phát `ChapterPublished` (kèm `isFirstPublish`, `addedBlockIds`, `removedBlockIds`) và `ChapterDeleted` (kèm `wasPublished`) qua in-process `IEventBus` sau khi commit transaction (Content module không sử dụng Outbox per ADR-02 / 3.6.8).
  - Triển khai Contracts: Cung cấp `GetPublishedChapterContent` (chỉ trả nội dung bản xuất bản, bảo mật không lộ đáp án), `ListPublishedBlocks` (hỗ trợ phân trang keyset theo `afterId`, giới hạn ≤ 50), `GetPublishedBlock`.
- **Nhánh Git:** `feat/T-S3-BE-02-publishing-contracts`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** DONE (100% build thành công, 84/84 unit tests pass)

---

## 2. Các thành phần đã triển khai

### 2.1. Đăng tải chương trọn gói (FR-CNT-16, §3.6.6.1, §3.6.6.3)
1. **`PublishChapterCommand` & `PublishChapterCommandHandler`:**
   - Xác thực quyền sở hữu khóa học của người gọi qua `ICourseContract.GetCourseAccess` (`AccessPurpose.Normal` tuân thủ Architecture Rule 9).
   - Kiểm tra trạng thái hiện tại: nếu chương đã đăng tải và không có thay đổi nháp mới (`publishedVersionNo == lastVersionNo`), trả về ngay thông tin chi tiết chương một cách idempotent.
   - **Kiểm tra 4 điều kiện tiên quyết (3.6.6.3):**
     1. Flashcard AI: Không còn thẻ nào ở trạng thái `ai_review_status == PENDING`.
     2. Tài nguyên đính kèm: Tất cả tài nguyên được tham chiếu qua `resourceId` phải tồn tại và chưa bị xóa mềm (`deleted_at == null`).
     3. Khối câu hỏi (`QUESTION`): Mọi câu hỏi tham chiếu qua `questionId` phải tồn tại trong cơ sở dữ liệu.
     4. Khối bài kiểm tra (`QUIZ`):
        - Thời gian hợp lệ (`openAt < closeAt` nếu cả hai được đặt).
        - Câu hỏi chỉ định thủ công: Phải tồn tại và ở trạng thái `QuestionStatus.Ready`.
        - Quy tắc ngẫu nhiên (`QuizRandomRule`): Ngân hàng câu hỏi của khóa học phải có đủ số lượng câu hỏi `READY` thỏa mãn bộ lọc (`filterTag`, `filterDifficultyCode`, `filterQuestionType`) đáp ứng `pickCount`.
     - Nếu vi phạm bất kỳ điều kiện nào: trả về mã lỗi `CHAPTER_PUBLISH_BLOCKED` (HTTP 422 `UnprocessableEntity`) kèm danh sách chi tiết lỗi tiếng Việt.
   - **Xử lý đăng tải nguyên khối trong 1 transaction:**
     - Đặt `chapter.Status = ChapterStatus.Published`, `published_version_no = last_version_no`, cập nhật `first_published_at` (nếu xuất bản lần đầu) và `last_published_at`.
     - Cập nhật thời điểm `published_at` trên bản ghi `cnt_chapter_version`.
     - Xóa toàn bộ và tái tạo các dòng chỉ mục `cnt_published_block` từ bản làm việc / snapshot hiện tại.
     - Tính toán danh sách khối thêm mới (`addedBlockIds`) và khối bị loại bỏ (`removedBlockIds`) so với lần xuất bản trước.
   - **Phát sự kiện sau commit:** Phát `ChapterPublished` qua `IEventBus.Publish` sau khi lưu vào database.

### 2.2. Lịch sử phiên bản & Khôi phục về bản nháp (FR-CNT-17, §3.6.6.1)
1. **`ListChapterVersionsQuery` & `ListChapterVersionsQueryHandler`:**
   - Endpoint: `GET /api/v1/courses/{courseId}/chapters/{chapterId}/versions?page={page}&pageSize={pageSize}`
   - Trả danh sách `ChapterVersionDto` gồm `versionNo`, `createdAt`, `publishedAt`, `restoredFromVersionNo` sắp xếp theo thứ tự giảm dần của `version_no`.
2. **`RestoreChapterVersionCommand` & `RestoreChapterVersionCommandHandler`:**
   - Endpoint: `POST /api/v1/courses/{courseId}/chapters/{chapterId}/versions/{versionNo}/restore`
   - Tìm kiếm phiên bản gốc `vK` trong `cnt_chapter_version`.
   - **Kiểm tra an toàn tham chiếu (§3.6.6.1):** Kiểm tra các tài nguyên và câu hỏi tham chiếu trong snapshot của bản `vK` xem còn tồn tại và chưa bị xóa hay không. Nếu có tài nguyên đã bị xóa, lập tức chặn với mã lỗi `RESTORE_BLOCKED`.
   - Ghi đè bản làm việc (`cnt_block`, `cnt_quiz_config`, `cnt_assignment_config`) từ snapshot của bản `vK` (giữ nguyên ID các Block).
   - Tăng `last_version_no = last_version_no + 1`.
   - Chèn bản ghi `cnt_chapter_version` mới với snapshot vừa khôi phục và đánh dấu `restored_from_version_no = versionNo`.
   - **Quan trọng:** Thao tác khôi phục chỉ ghi đè bản nháp, tuyệt đối KHÔNG can thiệp vào `cnt_published_block`, `published_version_no`, hay `status` của chương. Học viên chỉ thấy nội dung mới khi giảng viên đăng tải lại chương.

### 2.3. Xóa chương & Sự kiện ChapterDeleted
1. **`DeleteChapterCommandHandler`:**
   - Đặt `chapter.SoftDelete()` (`deleted_at = now`).
   - Xóa sạch các khối đã xuất bản `cnt_published_block` tương ứng (§3.6.6.1 N44).
   - Phát sự kiện tích hợp `ChapterDeleted` (chứa `wasPublished`) qua `IEventBus`.

### 2.4. Triển khai Hợp đồng `IContentContract`
1. **`GetPublishedChapterContent(Guid chapterId)`:**
   - Chỉ trả nội dung chương từ bảng `cnt_published_block` khi chương ở trạng thái `Published` và chưa xóa.
   - Snapshot chỉ chứa tham chiếu `resourceId` / `questionId`, tuyệt đối KHÔNG kèm đáp án hay phương án lựa chọn nhằm bảo mật đề thi.
2. **`ListPublishedBlocks(Guid? courseId, Guid? chapterId, Guid? afterId, int limit)`:**
   - Lọc các khối xuất bản thuộc chương `Published` chưa xóa.
   - Hỗ trợ lọc theo `courseId` hoặc `chapterId`.
   - Giới hạn phân trang an toàn: kẹp `limit` trong khoảng 1..50 (mặc định 50 per NFR-03).
   - Hỗ trợ keyset cursor phân trang theo `afterId`.
3. **`GetPublishedBlock(Guid blockId)`:**
   - Truy vấn thông tin khối đã xuất bản theo `blockId`. Trả `BLOCK_NOT_FOUND` nếu không tồn tại hoặc chương chưa đăng tải.

---

## 3. Kiểm thử & Độ tin cậy
- **Bộ kiểm thử `Content.UnitTests`:** 84/84 tests pass 100%.
  - `PublishingAndVersioningTests.cs`: Bao phủ đầy đủ các kịch bản đăng tải thành công, xuất bản chương rỗng, tính toán `addedBlockIds`/`removedBlockIds`, chặn `CHAPTER_PUBLISH_BLOCKED` khi flashcard AI pending, tài nguyên bị xóa, câu hỏi không tồn tại, quiz thiếu câu hỏi `READY`, cấu hình thời gian thi không hợp lệ, phân trang lịch sử phiên bản, khôi phục bản nháp an toàn, chặn khôi phục khi mất tham chiếu tài nguyên, dọn dẹp khối khi xóa chương và phát event `ChapterDeleted`, các truy vấn hợp đồng `GetPublishedChapterContent`, `ListPublishedBlocks`, `GetPublishedBlock`.
- **Kiến trúc & Ràng buộc:**
  - Build solution `dotnet build backend/BrainMemo.sln` đa luồng mặc định: 0 cảnh báo, 0 lỗi.
  - Tuân thủ nghiêm ngặt Rule 9 về `AccessPurpose.Normal`.
  - Không vi phạm nguyên tắc Outbox (Content module phát event in-process qua `IEventBus`).
