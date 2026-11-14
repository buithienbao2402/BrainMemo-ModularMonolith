# Handoff Note – T-S3-FE-01

## 1. Thông tin task
- **Task ID:** `T-S3-FE-01` (Batched từ `FE-01 + FE-02`)
- **Mô tả:** FE Content Editor Suite (Batched):
  - `SCR-CNT-01`: Quản lý mục lục chương & bài học (`/courses/:courseId/manage/content`).
  - `SCR-CNT-02`: Bộ công cụ soạn thảo chương dạng khối (`/courses/:courseId/manage/content/:chapterId`) với 10 loại khối (`RICH_TEXT`, `MARKDOWN`, `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `FLASHCARD`, `QUESTION`, `ASSIGNMENT`, `QUIZ`), khóa lạc quan (`baseVersionNo` -> 409 `VERSION_CONFLICT`), cảnh báo thay đổi chưa lưu (FR-CNT-16).
  - `SCR-CNT-03`: Modal lịch sử phiên bản & khôi phục bản nháp (FR-CNT-17).
  - `SCR-CNT-07`: Drawer và trang chuyên biệt quản lý kho tài nguyên khóa học (`/courses/:courseId/manage/resources` & `/manage/resources`) tuân thủ DEC-05 (Ảnh ≤ 5MB, Tệp ≤ 20MB) và xử lý xóa mềm 409 `RESOURCE_IN_USE`.
  - `FR-CNT-03`: Chế độ xem trước nội dung nháp dành cho học viên (`view=draft`) với carousel flashcard tương tác lật thẻ.
- **Nhánh Git:** `feat/T-S3-FE-01-content-editor-suite`
- **Vai trò:** Frontend Developer (FE)
- **Tình trạng:** DONE (100% build thành công, 0 lỗi TypeScript, 17/17 tests pass)

---

## 2. Các màn hình & thành phần đã phát triển

### 2.1. Quản lý mục lục chương – SCR-CNT-01 (`ChapterListPage.tsx`)
- Đường dẫn: `/courses/:courseId/manage/content`
- Danh sách chương kèm badge số thứ tự `position`, tiêu đề, mô tả và trạng thái (`Đã đăng tải`, `Bản nháp`, `Có sửa đổi chưa đăng tải`).
- Nút di chuyển thứ tự lên/xuống (gọi API reorder chapters).
- Modal tạo chương mới và modal xác nhận xóa mềm chương (`deleteChapter`).
- Drawer tài nguyên có thể mở trực tiếp từ thanh công cụ.

### 2.2. Soạn thảo khối chương – SCR-CNT-02 (`ChapterEditorPage.tsx`)
- Đường dẫn: `/courses/:courseId/manage/content/:chapterId`
- **10 loại Block biên soạn toàn diện:**
  1. `RICH_TEXT`: Trình soạn thảo văn bản phong phú inline (Bold, Italic, Underline, Strikethrough, Heading 2/3, Lists, Blockquote, Code block, Link).
  2. `MARKDOWN`: Trình biên soạn Markdown kèm thanh toggle xem trước kết quả render.
  3. `IMAGE`: Ảnh đính kèm (DEC-05 ≤ 5MB) tích hợp chọn từ Drawer tài nguyên hoặc tải lên trực tiếp.
  4. `VIDEO`: Video bài giảng (hỗ trợ MP4 stream hoặc embed URL).
  5. `AUDIO`: Tệp âm thanh/podcast học tập kèm trình phát audio native.
  6. `FILE`: Tệp đính kèm tài liệu học tập (DEC-05 ≤ 20MB) kèm nút kiểm tra tải xuống.
  7. `FLASHCARD`: Bộ thẻ ghi nhớ lật mặt tương tác, quản lý danh sách flashcard, badge trạng thái kiểm duyệt AI (`APPROVED`, `PENDING`, `REJECTED`).
  8. `QUESTION`: Khối câu hỏi trắc nghiệm/tự luận tham chiếu từ ngân hàng câu hỏi.
  9. `ASSIGNMENT`: Cấu hình bài tập thực hành (hạn nộp `dueAt`, điểm tối đa `maxPoints`, dung lượng tệp cho phép `maxFileSizeBytes`).
  10. `QUIZ`: Cấu hình bài thi trắc nghiệm (thời gian làm bài, tỷ lệ điểm đạt, số lần thử, thời điểm công bố kết quả, xáo trộn câu hỏi/đáp án, mật khẩu bài thi).
- **Khóa lạc quan (Optimistic Locking):**
  - Gửi `baseVersionNo` trong request lưu nháp `saveChapterDraft`.
  - Nếu server phát hiện phiên bản đã thay đổi bởi phiên khác (HTTP 409 `VERSION_CONFLICT`), hiển thị hộp thoại cảnh báo xung đột kèm nút "Tải lại bản mới nhất".
- **Bảo vệ dữ liệu chưa lưu (FR-CNT-16):**
  - Theo dõi trạng thái `isDirty`.
  - Đăng ký sự kiện `beforeunload` chặn đóng tab/trình duyệt khi còn thay đổi chưa lưu.
  - Hiển thị `UnsavedChangesDialog` khi điều hướng nội bộ trong ứng dụng mà chưa bấm "Lưu nháp".

### 2.3. Lịch sử phiên bản & Khôi phục – SCR-CNT-03 (`ChapterVersionsModal.tsx`)
- Danh sách phiên bản snapshot phân trang theo `versionNo` giảm dần.
- Đánh dấu phiên bản hiện tại, thời điểm tạo, thời điểm xuất bản, và thông tin nếu được khôi phục từ phiên bản cũ (`restoredFromVersionNo`).
- Nút "Khôi phục" kèm hộp thoại xác nhận an toàn trước khi gửi `POST /chapters/{chapterId}/versions/{versionNo}/restore`.

### 2.4. Quản lý kho tài nguyên – SCR-CNT-07 (`ResourceDrawer.tsx` & `ResourceManagementPage.tsx`)
- Hỗ trợ cả 2 chế độ:
  - Drawer trượt tích hợp ngay trong trang soạn bài học để chèn nhanh vào khối nội dung.
  - Trang độc lập tại `/courses/:courseId/manage/resources` và `/manage/resources`.
- Phân loại tài nguyên theo tab: Tất cả, Hình ảnh, Video, Âm thanh, Tài liệu PDF, Tệp khác.
- Tải lên kéo thả hỗ trợ kiểm tra kích thước phía client tuân thủ DEC-05 (Ảnh ≤ 5MB, Tệp ≤ 20MB).
- Quy trình upload: `POST /files/upload-urls` -> upload trực tiếp lên cloud storage qua PUT -> `POST /courses/{courseId}/resources` với `uploadKey`.
- Xử lý xóa tài nguyên an toàn: bắt mã lỗi HTTP 409 `RESOURCE_IN_USE` và hiển thị thông báo chi tiết khi tài nguyên đang được khối bài học tham chiếu.

### 2.5. Chế độ xem trước của học viên – FR-CNT-03 (`ChapterPreviewModal.tsx`)
- Hộp thoại toàn màn hình giả lập góc nhìn thực tế của học viên khi học bài (`view=draft`).
- Carousel thẻ nhớ tương tác: cho phép lật mặt trước/mặt sau thẻ nhớ, chuyển đổi thẻ tiếp theo/thẻ trước đó.

---

## 3. Kiểm thử & Độ tin cậy
- **Test suite:** `frontend/src/features/content/tests/contentEditorSuite.test.tsx`
- **Kết quả:** 17/17 tests pass 100%.
  - Bao phủ toàn diện 5 cụm chức năng: SCR-CNT-01 (Mục lục, reorder, create, soft delete, empty state), SCR-CNT-02 (Tải draft, 10 block types, dirty state, 409 conflict, publish, unsaved changes guard), SCR-CNT-03 (Lịch sử phiên bản, khôi phục), SCR-CNT-07 (Drawer tài nguyên, trang độc lập, lọc kind, 409 resource in use), FR-CNT-03 (Xem trước học viên, flashcard flip).
- **TypeScript & Build:**
  - `pnpm --filter frontend typecheck`: 0 lỗi.
  - `pnpm --filter frontend build`: Build production hoàn tất thành công.
