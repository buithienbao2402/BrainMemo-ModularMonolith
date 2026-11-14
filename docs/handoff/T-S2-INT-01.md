# Handoff Note — T-S2-INT-01 (Tích hợp S2 + e2e Playwright)

- **Task**: `T-S2-INT-01`
- **Role**: INT
- **Branch**: `feat/T-S2-INT-01-course-profile-e2e`
- **Status**: `DONE`

## 1. Phạm vi đã triển khai

Hoàn thành toàn diện luồng tích hợp End-to-End (E2E) cho Slice 2 (Hồ sơ cá nhân & Quản lý Khóa học) bằng Playwright theo đúng `AGENT.md §7`, ma trận phân quyền `3.5.8.1`, và quyết định kiến trúc `DEC-05` (S3/R2 direct upload), `DEC-16` (Bảo mật quyền riêng tư `ONLY_ME`):

1. **Kịch bản kiểm thử E2E tích hợp Slice 2** ([`frontend/e2e/course-profile-flow.spec.ts`](../../frontend/e2e/course-profile-flow.spec.ts)):
   - **Bước 1 – Đăng nhập hệ thống (`/login`):**
     - Đăng nhập với tài khoản hợp lệ (`quang.tran@brainmemo.vn`), xác nhận chuyển hướng an toàn và thanh điều hướng cập nhật phiên người dùng.
   - **Bước 2 – Cập nhật hồ sơ & Tải lên Avatar (`/settings/profile`):**
     - Form nạp dữ liệu hồ sơ hiện tại, bảo vệ trạng thái `isDirty` ngăn chặn background refetch ghi đè input người dùng.
     - Cập nhật Họ và tên hiển thị mới (`newDisplayName`), phần Giới thiệu (`newBio`).
     - Tải lên tệp ảnh đại diện avatar qua presigned URL (DEC-05 / S3 storage), xác nhận hiển thị nút `"Gỡ ảnh"`.
     - Nhấn `"Lưu thay đổi"`, xác nhận toast thông báo `"Cập nhật thành công"`.
   - **Bước 3 – Xem hồ sơ công khai tác giả (`/users/:userId` - SCR-PRF-01):**
     - Điều hướng tới trang cá nhân công khai của người dùng.
     - Xác nhận tiêu đề H1 hiển thị đúng Họ và tên hiển thị mới cập nhật, phần Giới thiệu mới và huy hiệu `"Hồ sơ của bạn"`.
   - **Bước 4 – Tạo khóa học mới kèm tải lên ảnh bìa (`/courses/new` - SCR-CRS-02):**
     - Điền tên khóa học (`courseTitle`), mô tả (`courseDesc`), gắn tag (`e2e`).
     - Chọn chế độ hiển thị `"Công khai"` (`PUBLIC`).
     - Tải lên ảnh bìa khóa học qua presigned upload endpoint, xác nhận nút tải chuyển sang `"Đổi ảnh"`.
     - Nhấn `"Tạo khóa học"`, chờ hệ thống tạo và tự động điều hướng sang trang chi tiết khóa học `/courses/:courseId` (SCR-CRS-01).
     - Xác nhận giao diện chi tiết hiển thị đầy đủ tên khóa học, huy hiệu `"Công khai"` (`Public`), thông báo `"Bạn là chủ biên soạn khóa học này."`, và nút liên kết `"Chỉnh sửa khóa học"`.
   - **Bước 5 – Xác nhận khóa học xuất hiện trên hồ sơ công khai (`/users/:userId`):**
     - Mở trang cá nhân công khai, chuyển sang tab `"Đã tạo"`.
     - Xác nhận khóa học công khai mới tạo xuất hiện trong danh sách.
   - **Bước 6 – Đổi trạng thái khóa học sang "Chỉ mình tôi" (`ONLY_ME` - `/courses/:id/edit`):**
     - Vào trang chỉnh sửa khóa học, chọn chế độ truy cập `"Chỉ mình tôi"` (`ONLY_ME`).
     - Nhấn `"Lưu thay đổi"`, điều hướng trở lại trang chi tiết `/courses/:id`.
     - Xác nhận chủ sở hữu vẫn xem được bình thường và huy hiệu chuyển thành `"Chỉ mình tôi"` (`Only Me`).
   - **Bước 7 – Kiểm tra bảo mật quyền riêng tư cho người ngoài (DEC-16 & Ma trận 3.5.8.1):**
     - Khởi tạo Browser Context độc lập hoàn toàn cho Khách vãng lai (`guestContext`), không mang session/cookie danh tính nhưng đồng bộ trạng thái lưu trữ cơ sở dữ liệu.
     - **7.1. Khách truy cập trực tiếp URL của khóa học ONLY_ME:** Nhận ngay thông báo lỗi HTTP 404 `"Không tìm thấy khóa học"` kèm mô tả `"Khóa học không tồn tại hoặc đã bị xóa."` (hoàn toàn che giấu sự tồn tại của khóa học, ngăn rò rỉ metadata).
     - **7.2. Khách vào trang hồ sơ công khai của tác giả (`/users/:userId`):** Tab `"Đã tạo"` hoàn toàn KHÔNG chứa khóa học `ONLY_ME` này.

2. **Đồng bộ hóa & Tối ưu hóa UI/Mock:**
   - Cập nhật [`frontend/src/features/profile/pages/EditProfilePage.tsx`](../../frontend/src/features/profile/pages/EditProfilePage.tsx) và [`frontend/src/features/course/pages/CourseFormPage.tsx`](../../frontend/src/features/course/pages/CourseFormPage.tsx): thêm cờ `isInitializedRef` và ràng buộc `isDirty` bảo vệ dữ liệu form khi có query refetch.
   - Cập nhật [`frontend/src/features/course/pages/CourseDetailPage.tsx`](../../frontend/src/features/course/pages/CourseDetailPage.tsx): hiển thị chính xác huy hiệu `accessMode` động (`PUBLIC`, `PRIVATE`, `ONLY_ME`).
   - Nâng cấp [`frontend/mocks/handlers.ts`](../../frontend/mocks/handlers.ts): bổ sung cơ chế lưu trữ bền vững `bm_mock_profiles` và `bm_mock_courses` qua `localStorage`, cho phép mock backend đồng bộ dữ liệu xuyên suốt các lượt điều hướng trang (`page.goto`) và hỗ trợ đa browser context trong kịch bản E2E.

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Kiểm thử E2E Playwright:**
   - Lệnh: `pnpm --filter frontend test:e2e`
   - Kết quả: **2/2 passed (100% xanh)**:
     - `auth-flow.spec.ts`: **passed** (4.0s).
     - `course-profile-flow.spec.ts`: **passed** (5.8s).

2. **Frontend Unit & Component Tests:**
   - Lệnh: `pnpm --filter frontend vitest run src/features/course/ src/features/profile/`
   - Kết quả: **2/2 test files, 16/16 tests passed (100% xanh)**.

3. **Frontend Typecheck:**
   - Lệnh: `pnpm --filter frontend typecheck` (`tsc -b --noEmit`)
   - Kết quả: **0 errors**, sạch 100%.

4. **Backend Unit Tests:**
   - `dotnet test backend/tests/Profile.UnitTests/Profile.UnitTests.csproj`: **21/21 passed (100% xanh)**.
   - `dotnet test backend/tests/Course.UnitTests/Course.UnitTests.csproj`: **57/57 passed (100% xanh)**.

5. **Backend Solution Build:**
   - Lệnh: `dotnet build backend/BrainMemo.sln` (đa luồng mặc định).
   - Kết quả: **Build succeeded. 0 Warning(s), 0 Error(s)** (32/32 projects).

## 3. Điểm lệch hợp đồng & Dữ liệu Mock/Seed

- Không có sai lệch hợp đồng so với OpenAPI và Contracts.
- Cơ chế bảo mật `ONLY_ME` theo DEC-16 và Ma trận 3.5.8.1 tuân thủ chuẩn trả về HTTP 404 ProblemDetails (`COURSE_NOT_FOUND`) đối với khách và người dùng ngoài.
