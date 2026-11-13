# Handoff Note – T-S1-FE-01

- **Task:** `T-S1-FE-01` – Auth & Account UI (Batched FE-01 + FE-02): SCR-AUTH-01..06 + SCR-COM-03 + sessions, guards, memory auth
- **Vai trò:** FE
- **Nhánh:** `feat/T-S1-FE-01-auth-account-ui`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Zod Validation Schemas & Types (`frontend/src/features/identity/schemas/`):**
   - [`frontend/src/features/identity/schemas/authSchemas.ts`](../../frontend/src/features/identity/schemas/authSchemas.ts):
     - `loginSchema`: Email chuẩn và mật khẩu bắt buộc.
     - `registerSchema`: Họ và tên, email, mật khẩu tối thiểu 8 ký tự, ít nhất 1 chữ hoa, 1 chữ số, và xác nhận mật khẩu khớp.
     - `forgotPasswordSchema`: Email hợp lệ.
     - `resetPasswordSchema`: Mật khẩu mới chuẩn bảo mật + xác nhận mật khẩu khớp.
     - `changePasswordSchema`: Mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ, xác nhận mật khẩu mới.

2. **TanStack Query Hooks & API Client Integration (`frontend/src/features/identity/api/`):**
   - [`frontend/src/features/identity/api/identityApi.ts`](../../frontend/src/features/identity/api/identityApi.ts):
     - `useLoginMutation`: `POST /auth/login`, tự động nạp access token vào `tokenStore` (RAM-only), invalidate query `auth.me`.
     - `useGoogleLoginMutation`: `POST /auth/google`, hỗ trợ đăng nhập OAuth qua idToken.
     - `useRegisterMutation`: `POST /auth/register`, gửi thông tin đăng ký tài khoản.
     - `useVerifyEmailMutation`: `POST /auth/verify-email`, kích hoạt tài khoản qua token query.
     - `useForgotPasswordMutation`: `POST /auth/forgot-password`, gửi yêu cầu đặt lại mật khẩu.
     - `useResetPasswordMutation`: `POST /auth/reset-password`, đặt mật khẩu mới với token.
     - `useChangePasswordMutation`: `POST /auth/change-password`, đổi mật khẩu người dùng đang đăng nhập.
     - `useCurrentUserQuery`: `GET /auth/me`, truy vấn thông tin người dùng hiện tại.
     - `useSessionsQuery`: `GET /auth/sessions`, danh sách phiên làm việc đang hoạt động.
     - `useRevokeSessionMutation`: `DELETE /auth/sessions/{id}`, thu hồi phiên đăng nhập cụ thể.
     - `useLogoutAllMutation`: `POST /auth/logout-all`, thu hồi toàn bộ các phiên khác.

3. **Màn hình Auth & Account (`SCR-AUTH-01..06`):**
   - [`frontend/src/features/identity/pages/LoginPage.tsx`](../../frontend/src/features/identity/pages/LoginPage.tsx) (`SCR-AUTH-01`):
     - Đăng nhập tài khoản với email & mật khẩu hoặc tiếp tục với Google.
     - Hỗ trợ chuyển hướng an toàn theo tham số `?next=` sau khi đăng nhập thành công.
     - Xử lý chi tiết lỗi RFC 9457: `401 Unauthorized` (sai tài khoản hoặc mật khẩu), `422 Unprocessable Content`, và tự động chuyển hướng sang trang `/locked` (`SCR-COM-03`) khi nhận lỗi `403 ACCOUNT_LOCKED`.
   - [`frontend/src/features/identity/pages/RegisterPage.tsx`](../../frontend/src/features/identity/pages/RegisterPage.tsx) (`SCR-AUTH-02`):
     - Đăng ký tài khoản người dùng mới với xác thực form realtime.
     - Xử lý mã lỗi `409 EMAIL_TAKEN` hiển thị thông báo email đã tồn tại.
     - Chuyển sang màn hình thông báo hoàn tất đăng ký và hướng dẫn kiểm tra hòm thư kích hoạt.
   - [`frontend/src/features/identity/pages/ForgotPasswordPage.tsx`](../../frontend/src/features/identity/pages/ForgotPasswordPage.tsx) (`SCR-AUTH-03`):
     - Yêu cầu link đặt lại mật khẩu.
     - Luôn hiển thị màn hình xác nhận an toàn bảo mật (không tiết lộ sự tồn tại của email trong hệ thống theo FR-IDN-07).
   - [`frontend/src/features/identity/pages/ResetPasswordPage.tsx`](../../frontend/src/features/identity/pages/ResetPasswordPage.tsx) (`SCR-AUTH-04`):
     - Trích xuất token từ URL query parameter `?token=`.
     - Bắt lỗi khi thiếu token hoặc token đã hết hạn/không hợp lệ, dẫn link yêu cầu cấp lại mã mới.
     - Đặt lại mật khẩu thành công và cung cấp nút chuyển hướng sang trang đăng nhập.
   - [`frontend/src/features/identity/pages/VerifyEmailPage.tsx`](../../frontend/src/features/identity/pages/VerifyEmailPage.tsx) (`SCR-AUTH-05`):
     - Tự động kích hoạt gọi API `POST /auth/verify-email` ngay khi trang tải.
     - Hiển thị rõ ràng 4 trạng thái: Đang xử lý, Thiếu mã xác minh, Kích hoạt thành công, và Lỗi xác minh (mã hết hạn hoặc không hợp lệ).
   - [`frontend/src/features/identity/pages/SecuritySettingsPage.tsx`](../../frontend/src/features/identity/pages/SecuritySettingsPage.tsx) (`SCR-AUTH-06`):
     - Màn hình bảo mật tài khoản người dùng, tích hợp đổi mật khẩu và quản lý phiên hoạt động.

4. **Components giao diện bảo mật & quản lý phiên (`frontend/src/features/identity/components/`):**
   - [`PasswordInput.tsx`](../../frontend/src/features/identity/components/PasswordInput.tsx): Input mật khẩu kèm toggle mắt ẩn/hiện và hỗ trợ Accessibility (`aria-label`).
   - [`GoogleAuthButton.tsx`](../../frontend/src/features/identity/components/GoogleAuthButton.tsx): Nút đăng nhập Google với logo SVG vector chuẩn.
   - [`ChangePasswordCard.tsx`](../../frontend/src/features/identity/components/ChangePasswordCard.tsx): Card đổi mật khẩu với kiểm tra quy tắc bảo mật, hiển thị lỗi `400` mật khẩu hiện tại không chính xác và `422` chi tiết.
   - [`SessionListCard.tsx`](../../frontend/src/features/identity/components/SessionListCard.tsx):
     - Danh sách phiên làm việc, tự động nhận diện thiết bị/hệ điều hành (Windows, macOS, Linux, iOS, Android) và trình duyệt (Chrome, Firefox, Safari, Edge) từ UserAgent.
     - Huy hiệu "Thiết bị hiện tại" nổi bật.
     - Dialog xác nhận thu hồi phiên đơn lẻ (`DELETE /auth/sessions/{id}`).
     - Dialog xác nhận đăng xuất khỏi tất cả các thiết bị khác (`POST /auth/logout-all`).

5. **Router, Mocks & i18n:**
   - [`frontend/src/app/router.tsx`](../../frontend/src/app/router.tsx): Thay thế các `RouteStubPage` bằng các trang thực tế `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, và `/settings/security`.
   - [`frontend/mocks/handlers.ts`](../../frontend/mocks/handlers.ts): Bổ sung mock handlers MSW hoàn chỉnh cho toàn bộ các endpoint auth (`login`, `google`, `register`, `verify-email`, `forgot-password`, `reset-password`, `change-password`, `sessions`, `delete session`, `logout-all`), hỗ trợ hàm reset mock state cho integration test.
   - [`frontend/src/shared/i18n/vi.json`](../../frontend/src/shared/i18n/vi.json): Cung cấp 100% nhãn tiếng Việt cho các trang và thông báo auth.

## Kết quả kiểm thử & kiểm tra chất lượng

Toàn bộ các công cụ kiểm tra chất lượng mã nguồn đều vượt qua thành công:
- **Format:** `npx prettier --check` – 100% tệp tuân thủ định dạng Prettier.
- **Lint:** `npx eslint .` – 0 lỗi, 0 cảnh báo.
- **Typecheck:** `npx tsc -b --noEmit` – 0 lỗi TypeScript compilation.
- **Unit & Integration Test:** `npx vitest run` – **5/5 test files, 35/35 tests pass** (100%):
  - `src/shared/api/errors.test.ts` (3 tests pass)
  - `src/shared/api/client.test.ts` (4 tests pass)
  - `src/app/AppShell.test.tsx` (5 tests pass)
  - `src/features/identity/tests/authPages.test.tsx` (16 tests pass)
  - `src/features/identity/tests/securitySettings.test.tsx` (7 tests pass)
- **Production Build:** `npx vite build` – Biên dịch thành công trong 3.34s, tạo đầy đủ `dist/` bundle (HTML, CSS, JS).

## Ràng buộc & Ghi chú

- **Bảo mật Token:** Access Token được duy trì hoàn toàn trong bộ nhớ RAM (`tokenStore.ts`), không ghi vào `localStorage` hay `sessionStorage`. Refresh Token được lưu trữ trong HttpOnly cookie do server quản lý.
- **Không sửa đổi backend/contracts:** Không thay đổi bất kỳ tệp nào trong `backend/` hoặc `openapi/`.
