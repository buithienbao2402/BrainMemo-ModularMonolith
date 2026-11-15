# Handoff Note — T-S3-INT-01 (Tích hợp S3 + e2e Playwright)

- **Task**: `T-S3-INT-01`
- **Role**: INT
- **Branch**: `feat/T-S3-INT-01-content-editor-e2e`
- **Status**: `DONE`

## 1. Phạm vi đã triển khai

Hoàn thành toàn diện luồng tích hợp End-to-End (E2E) cho Slice 3 (Biên tập bài học & Đề cương khóa học) bằng Playwright theo đúng `AGENT.md §7`, ma trận phân quyền `3.5.8.1`, và quyết định kiến trúc `DEC-05` (S3/R2 direct upload), `FR-CNT-03` (Xem trước học viên), `FR-CNT-16` (Khóa lạc quan & Đăng tải chương), `FR-CNT-17` (Lịch sử & Khôi phục phiên bản):

1. **Kịch bản kiểm thử E2E tích hợp Slice 3** ([`frontend/e2e/content-editor-flow.spec.ts`](../../frontend/e2e/content-editor-flow.spec.ts)):
   - **Bước 1 – Đăng nhập vai trò Giảng viên (`/login`):**
     - Đăng nhập với tài khoản instructor (`quang.tran@brainmemo.vn` / `Password123!`), xác nhận điều hướng và nạp cookie persona phiên người dùng.
   - **Bước 2 – Đề cương khóa học & Tạo chương mới (`/courses/:courseId/manage/content` - SCR-CNT-01):**
     - Truy cập trang quản lý đề cương bài học, mở modal *"Thêm chương mới"*.
     - Điền tiêu đề và tóm tắt mục tiêu chương, nhấn *"Tạo chương"*.
   - **Bước 3 – Trình soạn thảo khối bài học (`SCR-CNT-02`):**
     - Hệ thống tự động điều hướng vào màn hình biên soạn chương mới (`v1`, trạng thái *"Bản nháp"*).
     - **3.1 Khối Markdown:** Thêm khối Markdown, biên soạn nội dung cú pháp Markdown với tiêu đề và định dạng in đậm.
     - **3.2 Khối Hình ảnh & Tải lên trực tiếp (DEC-05):** Thêm khối Hình ảnh, giả lập tải lên tệp ảnh PNG thông qua presigned upload URL, kiểm tra gắn tài nguyên thành công và nút *"Gỡ tệp tài nguyên"*.
     - **3.3 Khối Thẻ ghi nhớ (Flashcard):** Thêm khối Flashcard, biên tập mặt trước (*Khái niệm/Câu hỏi*) và mặt sau (*Định nghĩa/Đáp án*), kiểm tra cờ `isDirty` kích hoạt trạng thái *"Chưa lưu"*.
   - **Bước 4 – Lưu nháp lần đầu (Optimistic Locking: v1 → v2):**
     - Nhấn *"Lưu nháp"*, xác nhận thông báo toast thành công, huy hiệu phiên bản tăng từ `v1` lên `v2`, trạng thái chuyển sang *"Đã lưu"*.
   - **Bước 5 – Xử lý xung đột 2 Tab song song (409 VERSION_CONFLICT):**
     - Mở Tab B song song trong cùng trình duyệt tải chương ở `v2`.
     - Tab B chỉnh sửa tiêu đề và nhấn *"Lưu nháp"*, server cập nhật lên phiên bản `v3`.
     - Tab A (vẫn giữ `baseVersionNo = 2`) chỉnh sửa tiêu đề khác và bấm *"Lưu nháp"*.
     - Server phát hiện xung đột phiên bản và trả về HTTP 409 `VERSION_CONFLICT`.
     - Tab A mở hộp thoại cảnh báo xung đột phiên bản `409` kèm thông báo chi tiết.
     - Tab A nhấn *"Tải lại bản mới nhất"*, cập nhật thành công dữ liệu mới nhất (`v3`) từ Tab B và đóng Tab B an toàn.
   - **Bước 6 – Đăng tải chương (FR-CNT-16):**
     - Tab A nhấn *"Đăng tải"*, kiểm tra thông báo xuất bản thành công và huy hiệu trạng thái chuyển sang *"Đã xuất bản"*.
   - **Bước 7 – Chế độ xem trước của học viên (FR-CNT-03):**
     - Nhấn *"Xem trước"*, modal toàn màn hình hiển thị chính xác giao diện người học.
     - Tương tác lật thẻ flashcard (SRS) kiểm tra hiển thị mặt trước và mặt sau, đóng xem trước.
   - **Bước 8 – Lịch sử phiên bản & Khôi phục bản cũ (SCR-CNT-03 & FR-CNT-17):**
     - Mở modal *"Lịch sử"* phiên bản, xác nhận hiển thị danh sách snapshot các phiên bản (`#1`, `#2`, `#3`).
     - Chọn khôi phục về phiên bản ban đầu `#1`, xác nhận qua hộp thoại xác nhận.
     - Kiểm tra toast thông báo *"Khôi phục phiên bản thành công"*.

2. **Cập nhật & Đồng bộ hạ tầng Mock Storage:**
   - Cập nhật [`frontend/mocks/handlers.ts`](../../frontend/mocks/handlers.ts): Bổ sung cơ chế lưu trữ đồng bộ localStorage cho chapters, versions, và resources (`bm_mock_chapters`, `bm_mock_versions`, `bm_mock_resources`).
   - Đảm bảo các luồng đa tab / đa trang chia sẻ cùng trạng thái server ảo, kích hoạt chính xác kiểm tra `baseVersionNo !== chapter.lastVersionNo` sinh mã lỗi HTTP 409 `VERSION_CONFLICT`.

---

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Kiểm thử E2E Playwright:**
   - Lệnh: `pnpm --filter frontend test:e2e e2e/content-editor-flow.spec.ts`
   - Kết quả: **1/1 passed (100% xanh)** trong 8.8s (tổng 14.2s).

2. **Frontend Content Unit & Component Tests:**
   - Lệnh: `pnpm --filter frontend test src/features/content/tests/contentEditorSuite.test.tsx --run`
   - Kết quả: **17/17 tests passed (100% xanh)**:
     - `SCR-CNT-01`: Chapter List Page (5 tests).
     - `SCR-CNT-02`: Chapter Editor Page & Optimistic Locking (7 tests).
     - `SCR-CNT-03`: Version History Modal (1 test).
     - `FR-CNT-03`: Chapter Preview Modal (1 test).

3. **Frontend Typecheck:**
   - Lệnh: `pnpm --filter frontend typecheck` (`tsc -b --noEmit`)
   - Kết quả: **0 errors**, sạch 100%.

---

## 3. Điểm lệch hợp đồng & Dữ liệu Mock/Seed

- Không có sai lệch hợp đồng so với OpenAPI và `contracts/openapi.yaml`.
- Cơ chế Optimistic Locking tuân thủ chuẩn `baseVersionNo` trong request body của `PUT /courses/{courseId}/chapters/{chapterId}/draft` và trả về mã lỗi 409 `VERSION_CONFLICT` RFC-7807 ProblemDetails.
