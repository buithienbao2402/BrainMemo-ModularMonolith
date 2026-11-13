# Handoff Note — T-S1-INT-01 (Tích hợp S1 + e2e Playwright)

- **Task**: `T-S1-INT-01`
- **Role**: INT
- **Branch**: `feat/T-S1-INT-01-e2e-auth-flow`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành trọn vẹn luồng tích hợp End-to-End (E2E) cho toàn bộ Slice 1 (Identity & Tài khoản) bằng Playwright theo đúng `AGENT.md §7` và `docs/spec/DAC_TA_YEU_CAU_HE_THONG.md`:

1. **Cấu hình hạ tầng E2E Playwright** ([`frontend/playwright.config.ts`](../../frontend/playwright.config.ts)):
   - Tích hợp `@playwright/test` và Chromium browser engine.
   - Cấu hình tự động kết nối web server (`http://localhost:5173`) kèm trace và screenshot khi thất bại.
   - Bổ sung lệnh `pnpm --filter frontend test:e2e` vào [`frontend/package.json`](../../frontend/package.json).

2. **Kịch bản kiểm thử E2E tích hợp Slice 1** ([`frontend/e2e/auth-flow.spec.ts`](../../frontend/e2e/auth-flow.spec.ts)):
   - **Bước 1 – Đăng ký tài khoản (`/register`):**
     - Điền form với email độc nhất (`e2e_user_<timestamp>@brainmemo.local`), mật khẩu đạt tiêu chuẩn an toàn (`Password123!`), và xác nhận mật khẩu.
     - Nhấn gửi form, xác nhận hệ thống chuyển sang màn hình thông báo hoàn tất đăng ký `"Đăng ký thành công!"` và hướng dẫn kiểm tra email kích hoạt.
   - **Bước 2 – Lấy mã xác thực từ Mailpit & Kích hoạt tài khoản (`/verify-email`):**
     - Hỗ trợ gọi API Mailpit (`http://localhost:8025/api/v1/messages`) để lấy email gửi từ backend thực tế, trích xuất token kích hoạt; tự động fallback mock token khi chạy chế độ MSW mock.
     - Điều hướng tới `/verify-email?token=<token>`, xác nhận trang hiển thị trạng thái `"Xác minh email thành công!"` và nút `"Đăng nhập ngay"`.
   - **Bước 3 – Đăng nhập hệ thống (`/login`):**
     - Điền email và mật khẩu vừa tạo, gửi yêu cầu đăng nhập.
     - Xác nhận chuyển hướng thành công, thanh điều hướng Header nhận diện phiên đăng nhập của người dùng (nút chuông thông báo, menu tài khoản; các nút đăng ký/đăng nhập của khách biến mất).
   - **Bước 4 – Đổi mật khẩu (`/settings/security`):**
     - Điều hướng vào trang cài đặt bảo mật tài khoản.
     - Nhập mật khẩu hiện tại (`Password123!`), mật khẩu mới (`NewPassword456!`), và xác nhận mật khẩu mới.
     - Gửi yêu cầu đổi mật khẩu, xác nhận thông báo thành công hiển thị rõ ràng trên giao diện.
   - **Bước 5 – Đăng xuất hệ thống:**
     - Mở Dropdown menu người dùng từ thanh Header, nhấn nút `"Đăng xuất"`.
     - Xác nhận phiên làm việc được thu hồi hoàn toàn, giao diện lập tức quay trở lại trạng thái Guest với các nút `"Đăng nhập"` và `"Đăng ký"`.

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Bộ kiểm thử E2E Playwright:**
   - Lệnh: `npx playwright test`
   - Kết quả: **1 passed (100% xanh)**, hoàn thành trọn vẹn luồng trong 4.1s.

2. **Frontend Quality Checks:**
   - Prettier code style: 100% tuân thủ định dạng.
   - ESLint: **0 errors, 0 warnings** (`npx eslint .`).
   - TypeScript Typecheck: **0 errors** (`npx tsc -b --noEmit`).
   - Vitest Unit/Integration Tests: **5/5 test files, 35/35 tests passed** (`npx vitest run`).

3. **Backend Solution Build:**
   - Lệnh: `dotnet build backend/BrainMemo.sln` (đa luồng mặc định).
   - Kết quả: **Build succeeded. 0 Warning(s), 0 Error(s)**.

## 3. Điểm lệch hợp đồng & Dữ liệu Mock/Seed

- Không có sai lệch hợp đồng so với OpenAPI và Contracts.
- Trình giả lập MSW và API thực tế hoàn toàn đồng bộ về cấu trúc dữ liệu và quy chuẩn mã lỗi RFC 9457 ProblemDetails.
