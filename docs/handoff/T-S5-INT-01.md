# Handoff Note — T-S5-INT-01 (Tích hợp S5 + e2e Playwright)

- **Task**: `T-S5-INT-01`
- **Role**: INT
- **Branch**: `dev/kim-thuan`
- **Status**: `DONE`

## 1. Phạm vi đã triển khai

Hoàn thành toàn diện luồng kiểm thử tích hợp End-to-End (E2E) cho Slice 5 (Khám phá, Tìm kiếm & Read model Discovery) bằng Playwright theo đúng `AGENT.md §7`, quy tắc hiển thị `3.6.1`, quyết định kiến trúc `D18`, `FR-DSC-01..09` (Trang chủ & Tìm kiếm), và tiêu chí nghiệm thu bắt buộc: *"Tạo khóa Public → thấy ở trang chủ/tìm kiếm → đổi Only Me → biến mất"*:

1. **Kịch bản kiểm thử E2E tích hợp Slice 5** ([`frontend/e2e/discovery-flow.spec.ts`](../../frontend/e2e/discovery-flow.spec.ts)):
   - **Bước 1 – Đăng nhập tài khoản Giảng viên (`/login`):**
     - Đăng nhập với tài khoản instructor (`quang.tran@brainmemo.vn` / `Password123!`), thiết lập cookie persona phiên làm việc.
   - **Bước 2 – Tạo khóa học mới chế độ Công khai (`/courses/new` - SCR-CRS-02):**
     - Tạo khóa học mới mang tiêu đề độc nhất `Khóa học E2E Discovery Public ${timestamp}`.
     - Chọn chế độ truy cập *"Công khai"* (`PUBLIC`).
     - Gửi form, điều hướng vào màn hình chi tiết khóa học và trích xuất `createdCourseId`.
   - **Bước 3 – Xác nhận hiển thị tại Trang chủ (`/` - SCR-DSC-01):**
     - Truy cập Trang chủ, kiểm tra khóa học công khai mới tạo xuất hiện trong danh mục "Mới cập nhật" / "Đề xuất".
   - **Bước 4 – Tìm kiếm và lọc tại Trang Khám phá (`/courses` - SCR-DSC-02):**
     - Truy cập `/courses`, nhập từ khóa tìm kiếm khóa học vừa tạo.
     - Kiểm tra đồng bộ URL parameter `?q=Discovery+Public+${timestamp}`.
     - Khóa học xuất hiện chính xác trong danh sách kết quả tìm kiếm.
   - **Bước 5 – Chuyển đổi quyền riêng tư sang "Chỉ mình tôi" (`ONLY_ME`):**
     - Truy cập trang chỉnh sửa `/courses/${createdCourseId}/edit`.
     - Thay đổi chế độ truy cập sang *"Chỉ mình tôi"* (`ONLY_ME`).
     - Lưu thay đổi thành công.
   - **Bước 6 – Nghiệm thu tiêu chí biến mất khỏi Khám phá (3.6.1 & D18):**
     - **Trang chủ (`/`):** Khóa học `ONLY_ME` lập tức biến mất hoàn toàn, không hiển thị trong bất kỳ khối đề xuất hoặc mới cập nhật nào.
     - **Trang tìm kiếm (`/courses`):** Tìm kiếm từ khóa khóa học trả về trạng thái rỗng (*"Không tìm thấy khóa học phù hợp"*), số lượng phần tử bằng 0.

2. **Cập nhật & Tối ưu hóa UI:**
   - Điều chỉnh lớp z-index cho form tìm kiếm trong [`frontend/src/features/discovery/pages/CourseDiscoveryPage.tsx`](../../frontend/src/features/discovery/pages/CourseDiscoveryPage.tsx) (`relative z-30`) đảm bảo backdrop lịch sử tìm kiếm không che chắn nút *"Tìm"*.

---

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Kiểm thử E2E Playwright:**
   - Lệnh: `pnpm --filter frontend test:e2e e2e/discovery-flow.spec.ts`
   - Kết quả: **1/1 passed (100% xanh)** trong 7.8s (tổng thời gian 13.6s).

2. **Frontend Discovery Unit Tests:**
   - Lệnh: `pnpm --filter frontend vitest run src/features/discovery`
   - Kết quả: **7/7 tests passed (100% xanh)**:
     - `SCR-DSC-01`: Trang chủ khám phá (3 tests).
     - `SCR-DSC-02`: Khám phá khóa học (4 tests).

3. **Frontend Typecheck:**
   - Lệnh: `pnpm --filter frontend typecheck` (`tsc -b --noEmit`)
   - Kết quả: **0 errors**, sạch 100%.

---

## 3. Điểm lệch hợp đồng & Dữ liệu Mock/Seed

- Không có sai lệch hợp đồng so với OpenAPI và `contracts/openapi.yaml`.
- Dữ liệu mock tuân thủ quy tắc nghiệp vụ 3.6.1: loại bỏ toàn bộ khóa học `ONLY_ME`, `HIDDEN`, `DELETED` khỏi read model Discovery.
