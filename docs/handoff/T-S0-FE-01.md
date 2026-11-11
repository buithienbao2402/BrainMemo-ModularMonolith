# Handoff Note – T-S0-FE-01

- **Task:** `T-S0-FE-01` – Vite + TS + Tailwind + shadcn + Router + TanStack Query + `shared/api` + `gen:api` + `MSW` + `SCR-COM-01/02`
- **Vai trò:** FE
- **Nhánh:** `feat/T-S0-FE-01-frontend-shell`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Thiết lập nền tảng Frontend (`frontend/` & workspace root):**
   - [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), [`frontend/package.json`](../../frontend/package.json): bổ sung workspace `frontend` (`React 18`, `Vite 8`, `TypeScript 5.9`, `Tailwind v3`, `Radix UI`, `React Router 6`, `TanStack Query 5`, `react-i18next`, `openapi-typescript`, `openapi-fetch`, `Vitest 5`, `Testing Library`, `MSW 3`).
   - [`frontend/vite.config.ts`](../../frontend/vite.config.ts), [`frontend/tsconfig.json`](../../frontend/tsconfig.json), [`frontend/tsconfig.app.json`](../../frontend/tsconfig.app.json), [`frontend/tailwind.config.ts`](../../frontend/tailwind.config.ts), [`frontend/src/shared/styles/globals.css`](../../frontend/src/shared/styles/globals.css): cấu hình alias `@`/`@mocks`, proxy `/api` → `http://localhost:5000`, token màu Dark (`#0e0e12`, `#131319`, `#1b1b21`, `#26232b`) / Light (`#ffffff`, `#f9fafb`, `#e5e7eb`) / cam thương hiệu `#ff7a1a`, font `Inter` + `Merriweather` khớp file Figma `UI-BrainMemo-LMS`.
   - [`frontend/.env.example`](../../frontend/.env.example), [`frontend/.prettierignore`](../../frontend/.prettierignore), [`frontend/.gitignore`](../../frontend/.gitignore): cấu hình `VITE_API_BASE_URL=/api/v1` và `VITE_USE_MOCK=true`.

2. **Tầng `shared/api` sinh kiểu từ OpenAPI & xử lý xác thực bộ nhớ (`RAM-only`):**
   - [`frontend/src/shared/api/schema.d.ts`](../../frontend/src/shared/api/schema.d.ts): sinh trực tiếp bằng `corepack pnpm --filter frontend gen:api` từ [`openapi/openapi.yaml`](../../openapi/openapi.yaml) (**không chỉnh sửa tay**).
   - [`frontend/src/shared/api/tokenStore.ts`](../../frontend/src/shared/api/tokenStore.ts): chỉ giữ `accessToken` trong biến nhớ JS; không lưu vào `localStorage`/`sessionStorage`.
   - [`frontend/src/shared/api/client.ts`](../../frontend/src/shared/api/client.ts): `createManagedApiClient` (`openapi-fetch`) gắn `credentials: 'include'`, tự động tiêm `Authorization: Bearer ...`, **single-flight** `POST /auth/refresh` khi nhiều request `401` đồng thời (chỉ gọi `/auth/refresh` 1 lần và retry mỗi request tối đa 1 lần, giữ nguyên body JSON khi retry), phân phối callback `onSessionExpired`, `onAccountLocked`, `onRateLimited` (cooldown 10s), `onServerError`.
   - [`frontend/src/shared/api/errors.ts`](../../frontend/src/shared/api/errors.ts): parse chuẩn RFC 9457 (`ApiProblemError`, `mapValidationErrorsToFields` cho `422`, phân loại `ACCOUNT_LOCKED`, `PASSCODE_REQUIRED`, `NOT_ENROLLED`, `VERSION_CONFLICT`, `429`, `5xx`/network).
   - [`frontend/src/shared/api/queryKeys.ts`](../../frontend/src/shared/api/queryKeys.ts): factory key TanStack Query dùng chung theo module.

3. **Providers, Guards, Layouts & Màn hình `SCR-COM-01/02/03`:**
   - [`frontend/src/app/providers.tsx`](../../frontend/src/app/providers.tsx), [`frontend/src/shared/hooks/`](../../frontend/src/shared/hooks/index.ts): `QueryClientProvider`, `ThemeProvider` (`uiTheme` từ profile hoặc `prefers-color-scheme` cho guest), `ToastProvider`, `RateLimitProvider` (khóa thao tác 10s khi `429`), `AuthProvider` (boot gọi `POST /auth/refresh` → `GET /auth/me`/`GET /profiles/me`, polling `GET /notifications/unread-count` mỗi **30s** chỉ khi tab `document.visibilityState === 'visible'`).
   - [`frontend/src/shared/ui/`](../../frontend/src/shared/ui/index.ts): `Button`, `Input`, `Dialog`, `DropdownMenu`, `Skeleton`/`PageSkeleton`, `EmptyState`, `ErrorState`, `Pagination` (`MAX_PAGE_SIZE = 50`), `Toast`/`Toaster`.
   - [`frontend/src/app/layouts/`](../../frontend/src/app/layouts/index.ts): `PublicLayout`, `AppLayout`, `AdminLayout` (sidebar responsive 288px + drawer mobile + top bar từ các frame Figma `12:1330`, `12:3`, `12:1316`, `13:2455`, `15:3975`, `53:2`, `102:932`, `102:904`), gắn logo SVG cục bộ tải từ Figma (`frontend/src/assets/figma/brand-logo-sm.svg`, `brand-logo-lg.svg`).
   - [`frontend/src/app/guards/`](../../frontend/src/app/guards/index.ts): `RequireAuth` (redirect `/login?next=`), `RequireAdmin`, `RequireVerifiedEmail` (hiển thị banner nhắc xác minh email một lần không trùng lặp với `AppLayout`).
   - [`frontend/src/app/pages/`](../../frontend/src/app/pages/index.ts) & [`frontend/src/app/router.tsx`](../../frontend/src/app/router.tsx): `SCR-COM-01` ([`HomeShellPage.tsx`](../../frontend/src/app/pages/HomeShellPage.tsx) kèm trình chuyển nhanh 4 trạng thái `Loading`/`Empty`/`Error`/`Success` và bộ chọn mock persona khi `VITE_USE_MOCK=true`), `SCR-COM-02` ([`NotFoundPage.tsx`](../../frontend/src/app/pages/NotFoundPage.tsx) cho `/404` và `*`), `SCR-COM-03` ([`LockedAccountPage.tsx`](../../frontend/src/app/pages/LockedAccountPage.tsx) cho `/locked`), cùng route stub cho các màn S1+.
   - [`frontend/src/shared/i18n/vi.json`](../../frontend/src/shared/i18n/vi.json): 100% nhãn giao diện tiếng Việt qua `react-i18next`.

4. **MSW (`VITE_USE_MOCK=true`) & Kiểm thử:**
   - [`frontend/mocks/handlers.ts`](../../frontend/mocks/handlers.ts), [`frontend/mocks/browser.ts`](../../frontend/mocks/browser.ts), [`frontend/mocks/server.ts`](../../frontend/mocks/server.ts), [`frontend/public/mockServiceWorker.js`](../../frontend/public/mockServiceWorker.js): mock các endpoint nền (`POST /auth/refresh`, `GET /auth/me`, `POST /auth/logout`, `GET/PUT /profiles/me`, `GET /notifications/unread-count`) khớp schema OpenAPI; hỗ trợ đổi persona (`guest`, `user`, `unverified`, `admin`, `locked`) trong dev thông qua cookie `bm_mock_persona`.
   - Unit & Integration Tests (`Vitest` + `Testing Library` + `MSW`):
     - [`frontend/src/shared/api/errors.test.ts`](../../frontend/src/shared/api/errors.test.ts) (3 tests)
     - [`frontend/src/shared/api/client.test.ts`](../../frontend/src/shared/api/client.test.ts) (4 tests: bộ nhớ token không dùng Web Storage, single-flight refresh khi 3 request 401 đồng thời, giữ body khi retry POST/PUT, callback `403 ACCOUNT_LOCKED`/`429`/`500`)
     - [`frontend/src/app/AppShell.test.tsx`](../../frontend/src/app/AppShell.test.tsx) (5 tests: Guest `SCR-COM-01` + 4 trạng thái + toggle Sáng/Tối, Learner `Quang Trần` + unread bell + Profile Menu + Logout, `RequireAuth` + `SCR-COM-02` 404, `RequireVerifiedEmail` + chặn non-admin vào `/admin`, `AdminLayout` + `SCR-COM-03` `/locked`)

## Kết quả kiểm tra

- `corepack pnpm --filter frontend gen:api`: thành công (`openapi-typescript 7.13.0`, sinh `./src/shared/api/schema.d.ts` trong `204.7ms`).
- `corepack pnpm --filter frontend typecheck`: thành công (`tsc -b --noEmit`, 0 lỗi).
- `corepack pnpm --filter frontend lint`: thành công (`eslint .`, 0 lỗi, 0 cảnh báo).
- `corepack pnpm --filter frontend format:check`: thành công (`All matched files use Prettier code style!`).
- `corepack pnpm --filter frontend build`: thành công (`vite build` hoàn tất trong `1.70s`, `dist/index.html`, CSS, JS).
- `corepack pnpm --filter frontend test`: **3 test files, 12/12 tests passed**, 0 failed, 0 skipped.
- Dev server check (`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort`): `VITE v8.3.7 ready in 236 ms`, HTTP GET `http://127.0.0.1:4173/` trả `200` chứa HTML `BrainMemo`.

## Ràng buộc & Điểm cần lưu ý

- Truy cập Figma trực tiếp qua `figma_figma` MCP (`UI-BrainMemo-LMS`, file key `JrZ2EN5MfRmx8JoHzaVz0L`, ghi nhận ở [`docs/OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) `[OQ-01]` & `[OQ-02]`). `SCR-COM-02` (404) và `SCR-AUTH-01..05` hiện chưa có frame riêng trên `Page 1` Figma; nếu bổ sung trước `T-S1-FE-01` có thể căn chỉnh thêm mà không đổi kiến trúc router/layout.
- Đã ghim `typescript@^5.9.3` trong [`frontend/package.json`](../../frontend/package.json) do `openapi-typescript@7.13.0` (`^5.x`) và `typescript-eslint@8.72.2` (`<6.1.0`) không tương thích JS compiler API của TypeScript `7.0.2`.
- Không chỉnh sửa `backend/`, `openapi/` hoặc `contracts/`.

