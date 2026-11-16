# Handoff Note — T-S4-INT-01 (Tích hợp S4 + e2e Playwright)

- **Task**: `T-S4-INT-01`
- **Role**: INT
- **Branch**: `dev/kim-thuan`
- **Status**: `DONE`

## 1. Phạm vi đã triển khai

Hoàn thành toàn diện luồng kiểm thử tích hợp End-to-End (E2E) cho Slice 4 (Ghi danh, Quản lý học viên & Trình đọc bài học) bằng Playwright theo đúng `AGENT.md §7`, ma trận phân quyền `3.5.8.1`, `DEC-03` (Progress tracking & Course Access Mode), `FR-LRN-01` (Trình đọc bài học), `FR-LRN-02` (Hoàn thành block & Tiến độ), `FR-LRN-03` (Bookmark & `/me/bookmarks`), `FR-CRS-07` (Quản lý học viên SCR-CRS-05), `FR-CRS-08` (Cấu hình quyền truy cập & Passcode SCR-CRS-06):

1. **Kịch bản kiểm thử E2E tích hợp Slice 4** ([`frontend/e2e/enrollment-learning-flow.spec.ts`](../../frontend/e2e/enrollment-learning-flow.spec.ts)):
   - **Phần 1 – Ghi danh khóa học Public → Đọc bài học → Tiến độ → Bookmark:**
     - Đăng nhập người dùng học viên (`quang.tran@brainmemo.vn` / `Password123!`).
     - Truy cập khóa học Public, tham gia khóa học (`POST /courses/{id}/enrollments`).
     - Vào trình đọc bài học (`/courses/:courseId/learn/:chapterId` - `SCR-LRN-01`).
     - Tương tác với Thẻ ghi nhớ 3D (Flashcard): lật mặt trước và mặt sau (`rotateY(180deg)`).
     - Trả lời câu hỏi thực hành (`POST /blocks/{blockId}/practice-answer`), nhận phản hồi đánh giá và giải thích chi tiết.
     - Đánh dấu hoàn thành khối bài học (`POST /blocks/{blockId}/complete`), cập nhật thanh tiến độ chương và khóa học (`GET /progress`).
     - Đánh dấu Bookmark bài học (`PUT /courses/{id}/bookmark`), chuyển trạng thái nút sang *"Đã lưu"*.
     - Truy cập trang Khóa học & Bài học đã lưu (`/me/bookmarks` - `SCR-LRN-07`), xác nhận hiển thị thẻ khóa học kèm CTA *"Tiếp tục học"*.
   - **Phần 2 – Cấu hình quyền truy cập (SCR-CRS-06) & Quản lý học viên (SCR-CRS-05):**
     - Giảng viên truy cập trang Cấu hình truy cập (`/courses/:courseId/manage/access`): Kiểm tra các chế độ truy cập (PUBLIC, PRIVATE, ONLY_ME).
     - Mở modal cấu hình passcode cho từng chương học, hỗ trợ khóa và thay đổi mật khẩu chương.
     - Truy cập Quản lý học viên (`/courses/:courseId/manage/students`): 4 tabs (Đang học, Đã hoàn thành, Chờ duyệt, Đã mời).
     - Mời học viên mới qua email modal (`POST /invitations`).
     - Chuyển tab *"Chờ duyệt"* và thực hiện phê duyệt yêu cầu ghi danh của học viên (`POST /enrollment-requests/{requestId}/decision`).
   - **Phần 3 – Bảo vệ Passcode chương học & Mở khóa thành công:**
     - Truy cập chương học có cấu hình bảo vệ Passcode (`/courses/:courseId/learn/chapter-3333-protected`).
     - Hệ thống phát hiện mã lỗi HTTP 403 `PASSCODE_REQUIRED` và tự động hiển thị Modal yêu cầu nhập Passcode.
     - Nhập sai Passcode (`9999`) → Hệ thống báo lỗi *"Mật khẩu mở khóa không chính xác"*.
     - Nhập đúng Passcode (`1234`) → Mở khóa thành công, đóng modal và render toàn bộ nội dung khối bài học bảo mật.

2. **Cập nhật & Đồng bộ hạ tầng Component & Mocks:**
   - Cập nhật [`frontend/src/features/learning/components/BookmarkButton.tsx`](../../frontend/src/features/learning/components/BookmarkButton.tsx): Chuẩn hóa `aria-label` và `title` đồng bộ với trạng thái nút bấm (*"Lưu bài"* / *"Đã lưu"*).
   - Hạ tầng MSW mocks đã sẵn sàng đầy đủ các kịch bản ghi danh, duyệt yêu cầu, rate-limit passcode, bookmark, block completion.

---

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Kiểm thử E2E Playwright:**
   - Lệnh: `pnpm --filter frontend test:e2e e2e/enrollment-learning-flow.spec.ts`
   - Kết quả: **1/1 passed (100% xanh)** trong 8.5s (tổng thời gian 14.2s).

2. **Frontend Learning & Course Unit Tests:**
   - Lệnh: `pnpm --filter frontend vitest run src/features/learning`
   - Kết quả: **10/10 tests passed (100% xanh)**:
     - `SCR-CRS-05`: Quản lý học viên (3 tests).
     - `SCR-CRS-06`: Cấu hình quyền truy cập & Passcode (2 tests).
     - `SCR-LRN-01`: Trình đọc bài học & Passcode gate (3 tests).
     - `SCR-LRN-07`: Trang Bookmark cá nhân (2 tests).

3. **Frontend Typecheck:**
   - Lệnh: `pnpm --filter frontend typecheck` (`tsc -b --noEmit`)
   - Kết quả: **0 errors**, sạch 100%.

---

## 3. Điểm lệch hợp đồng & Dữ liệu Mock/Seed

- Không có sai lệch hợp đồng so với OpenAPI và `contracts/openapi.yaml`.
- Dữ liệu mock kịch bản bảo vệ passcode tuân thủ mã lỗi 403 `PASSCODE_REQUIRED` và RFC-7807 ProblemDetails.
