# FRONTEND_SPEC – Đặc tả Giao diện & Quy ước Kỹ thuật Frontend BrainMemo LMS

Nguồn thiết kế chính thức: **File Figma [UI BrainMemo LMS](https://www.figma.com/design/JrZ2EN5MfRmx8JoHzaVz0L/UI-BrainMemo-LMS?node-id=0-1)**.
Toàn bộ hệ thống giao diện, bố cục, màu sắc, typography và luồng tương tác của Frontend phải tuân thủ nghiêm ngặt 66 khung hình (frames/screens/dialogs/drawers) đã được chuẩn hóa trên `Page 1` của Figma.

> **Nguyên tắc tích hợp:**
> - **Dữ liệu & Kiểu:** Lấy từ OpenAPI schema (`shared/api/schema.d.ts`), sinh bằng `corepack pnpm --filter frontend gen:api`. Tuyệt đối không tự bịa endpoint, trường dữ liệu, hoặc mã lỗi.
> - **Giao diện & Trải nghiệm:** Lấy trực tiếp từ file thiết kế Figma. Khi có sự khác biệt giữa hai bên: **OpenAPI là chuẩn duy nhất về dữ liệu, Figma là chuẩn duy nhất về bố cục, màu sắc và tương tác UI**.

---

## 1. Công nghệ (Tech Stack)
- **Framework & Build:** Vite 8 · React 18 · TypeScript 5.9+ (strict mode) · Node.js ≥ 20.
- **Routing & State:** React Router 6 (Data Router pattern) · TanStack Query 5 (Server State management).
- **Forms & Validation:** React Hook Form · Zod validation schemas.
- **Styling & Components:** Tailwind CSS v3 · Radix UI primitives / shadcn/ui · Lucide React icons.
- **Rich Text & Content Editor:** Tiptap (Rich Text wysiwyg) · Markdown parser.
- **API Client:** `openapi-fetch` kết hợp `openapi-typescript` (type-safe REST client).
- **Internationalization:** `react-i18next` (100% nhãn giao diện tiếng Việt tại `shared/i18n/vi.json`).
- **Date & Time:** `date-fns` (xử lý thời gian, định dạng hiển thị múi giờ địa phương, gửi server theo chuẩn UTC ISO-8601).
- **Testing & Tooling:** Vitest · React Testing Library · MSW v2 (Mock Service Worker) · Playwright (E2E).
- **Package Manager:** `pnpm` (quản lý monorepo workspace).

---

## 2. Hệ thống Thiết kế (Design System & Design Tokens từ Figma)

Hệ thống giao diện được thiết kế với phong cách Dark Mode hiện đại làm trọng tâm, đồng thời hỗ trợ đầy đủ Light Mode.

### 2.1. Bảng màu chuẩn (Color Palette)
- **Màu thương hiệu chủ đạo (Primary Accent):**
  - Brand Orange: `#ff7a1a` (hover: `#e66a12`, active: `#cc5d0e`, light-tint: `#fff3eb`, dark-tint: `#25170d`).
  - Được áp dụng cho: Nút hành động chính (Primary CTA), trạng thái đang chọn (active nav link), thanh tiến độ học tập, huy hiệu nổi bật.
- **Giao diện Tối (Dark Theme - Mặc định / Ưu tiên trong Figma):**
  - Nền ứng dụng chính (Canvas Background): `#0e0e12` hoặc `#121212`.
  - Nền Thẻ / Header / Sidebar (Card & Surface): `#131319` hoặc `#1e1e1e`.
  - Khối nâng cao / Input / Hover dòng (Elevated & Hover): `#1b1b21` hoặc `#252525`.
  - Đường viền / Đường phân cách (Borders & Dividers): `#26232b` hoặc `#2d2d2d`.
  - Chữ chính (Foreground / Headings): `#f3f4f6` (Off-white).
  - Chữ phụ / Mô tả (Muted Text): `#9ca3af` / `#6b7280`.
- **Giao diện Sáng (Light Theme):**
  - Nền ứng dụng: `#ffffff` / `#f9fafb`.
  - Nền Thẻ / Header: `#ffffff`.
  - Khối nâng cao / Input: `#f3f4f6`.
  - Đường viền: `#e5e7eb`.
  - Chữ chính: `#111827`.
  - Chữ phụ: `#4b5563` / `#6b7280`.
- **Màu sắc Trạng thái & Phản hồi (Functional / Status Colors):**
  - **Thành công (Success):** Emerald / Green `#10b981` (Hoàn thành bài học, đạt chuẩn CLO, điểm thi đỗ).
  - **Cảnh báo (Warning):** Amber / Yellow `#f59e0b` (Bài chờ chấm, nộp muộn, nháp chưa xuất bản).
  - **Nguy hiểm / Lỗi (Destructive / Error):** Crimson Red `#ef4444` (Khóa tài khoản vĩnh viễn, xóa khóa học, vi phạm báo cáo, lỗi API).
  - **Thông tin (Info):** Cyan / Blue `#3b82f6` (Huy hiệu chỉ dẫn, bộ lọc đang chọn).

### 2.2. Phông chữ (Typography)
- **Tiêu đề & Thương hiệu (Brand Serif):** `Merriweather`, Georgia, serif (dùng cho Tiêu đề khóa học, Heading nổi bật, Logo text).
- **Giao diện & Nội dung chính (UI Sans):** `Inter`, system-ui, -apple-system, sans-serif (dùng cho toàn bộ body text, nút bấm, bảng biểu, menu, form fields).
- **Mã nguồn & Toán học (Monospace):** `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace (dùng cho khối code block, biểu thức, token).

### 2.3. Quy cách Bo góc & Đổ bóng (Border Radius & Elevation)
- `rounded-lg`: `0.75rem` (`12px`) áp dụng cho Cards, Modals, Drawers, Preview blocks.
- `rounded-md`: `0.5rem` (`8px`) áp dụng cho Buttons, Inputs, Dropdown items.
- `rounded-full`: `9999px` áp dụng cho Avatar, Status pill badges, Floating action buttons.
- Thanh cuộn (Scrollbar): Tùy biến thanh mảnh (`thin`), tông màu tệp với nền (`hsl(var(--muted-foreground) / 0.3)`).

---

## 3. Cấu trúc Layouts & Điều hướng

Ứng dụng chia thành 3 khung bố cục chính:

```
src/app/
├── layouts/
│   ├── PublicLayout.tsx       # Khách (Guest landing, login, register, catalog)
│   ├── AppLayout.tsx          # Người học & Giảng viên (Dashboard, reader, editor)
│   └── AdminLayout.tsx        # Quản trị viên (Sidebar cố định 288px + header quản trị)
├── guards/
│   ├── RequireAuth.tsx        # Chặn truy cập khi chưa đăng nhập (?next=)
│   ├── RequireAdmin.tsx       # Chặn non-admin vào /admin
│   └── RequireVerifiedEmail.tsx # Banner nhắc xác minh email cho tính năng tạo khóa/AI
└── router.tsx                 # Định nghĩa toàn bộ cây Route
```

### 3.1. PublicLayout
- Áp dụng cho: Trang chủ khách (`SCR-DSC-01`), Khám phá (`SCR-DSC-02`), Giới thiệu khóa học (`SCR-CRS-01`), Auth pages (`SCR-AUTH-01..05`).
- Thành phần: Topbar đơn giản với Logo BrainMemo, Tìm kiếm nhanh, Nút ThemeToggle, Nút "Đăng nhập" và "Đăng ký" (nền cam `#ff7a1a`), Chân trang (SiteFooter).

### 3.2. AppLayout
- Áp dụng cho: Mọi màn hình người dùng đã đăng nhập (Learner, Teacher/Author).
- Thành phần:
  - Header: Logo BrainMemo SVG, Thanh tìm kiếm toàn cục (`/courses`), Navigation links (Trang chủ, Khám phá, Khóa học của tôi), Nút ThemeToggle.
  - Chuông thông báo (`NotificationBellLink`): Polling 30s lấy `unreadCount`, mở nhanh popover `Thông báo drop-down` hoặc dẫn tới `/notifications`.
  - Avatar menu (`Profile menu`): Tên hiển thị, email, liên kết Hồ sơ cá nhân, Khóa học của tôi, Bookmarks đã lưu, Cài đặt bảo mật, Đăng xuất.

### 3.3. AdminLayout
- Áp dụng cho: Toàn bộ phân hệ Quản trị viên (`/admin/*`).
- Thành phần:
  - Sidebar cố định bên trái (chiều rộng 288px, hỗ trợ thu gọn drawer trên mobile).
  - Menu điều hướng quản trị 8 nhóm: Tổng quan, Người dùng, Khóa học, Hàng đợi báo cáo, Nhật ký hệ thống, Xử phạt, Thông báo, Cài đặt.
  - Topbar admin: Breadcrumbs động, thông tin phiên quản trị viên, nút quay lại giao diện người dùng.

### 3.4. Không gian làm việc đa cột (Multi-Column Workspace Layouts)
- **Trình soạn thảo chương (SCR-CNT-02):** Cột trái là Mục lục chương; Cột giữa là Canvas soạn 10 khối nội dung; Cột/Drawer phải là Lịch sử phiên bản, Flashcard, Quản lý tài nguyên.
- **Không gian chấm bài (SCR-AST-05):** Cột trái là Danh sách bài chờ chấm; Cột giữa là Bài làm học viên; Cột phải là Barem tiêu chí chấm điểm và nhận xét.

---

## 4. Xác thực, Phiên làm việc & Bảo mật

- **Lưu trữ Access Token trong RAM (RAM-only store):** Không lưu token vào `localStorage` hay `sessionStorage` để triệt tiêu lỗ hổng XSS (NFR-04).
- **Refresh Token bằng HttpOnly Cookie:** Trình duyệt tự động gửi cookie khi gọi `POST /api/v1/auth/refresh` với `credentials: 'include'`.
- **Single-Flight Refresh Token:**
  - Khi nhiều request đồng thời nhận `401 Unauthorized`, hệ thống chỉ kích hoạt **duy nhất 1 request** gọi `/auth/refresh`.
  - Các request còn lại xếp hàng đợi kết quả promise dùng chung, nạp token mới vào bộ nhớ và retry lại đúng 1 lần (giữ nguyên body JSON).
  - Nếu refresh thất bại: Xóa trạng thái phiên và chuyển hướng về `/login?next=`.
- **Xử lý tài khoản bị khóa (`403 ACCOUNT_LOCKED`):**
  - Tự động xóa phiên và chuyển hướng ngay sang trang `/locked` (`SCR-COM-03`).
  - Giao diện hiển thị rõ loại khóa: Tạm thời (kèm thời hạn và lý do) hoặc Vĩnh viễn theo thiết kế Figma.
- **Khách (Guest CTA):** Ẩn các nút lưu tiến độ, nộp bài, bookmark, bình luận; thay bằng hộp thoại hoặc nút CTA mời đăng nhập.

---

## 5. Xử lý Lỗi & Phản hồi (RFC 9457 Problem Details)

Toàn bộ lỗi từ API trả về theo chuẩn `application/problem+json` với thông điệp tiếng Việt:

| Mã HTTP | Mã lỗi / Tình huống | Hành vi giao diện |
|:---|:---|:---|
| **422** | `Unprocessable Content` | Ánh xạ mảng `Problem.errors[].field` trực tiếp vào ô input tương ứng; giữ nguyên toàn bộ dữ liệu đã nhập trên form (NFR-20). |
| **401** | `Unauthorized` | Single-flight refresh token → thử lại 1 lần; nếu thất bại chuyển hướng về `/login?next=`. |
| **403** | `ACCOUNT_LOCKED` | Chuyển hướng sang trang `/locked` (`SCR-COM-03`) hiển thị chi tiết lý do và thời hạn. |
| **403** | `PASSCODE_REQUIRED` | Mở hộp thoại modal nhập Passcode chương (`SCR-LRN-01 - Đọc chương protected`). |
| **403** | `NOT_ENROLLED` | Hiển thị nút CTA "Tham gia khóa học" hoặc "Gửi yêu cầu ghi danh". |
| **403** | `EMAIL_NOT_VERIFIED` | Hiển thị banner cam trên đầu màn hình nhắc kích hoạt tài khoản kèm nút gửi lại mã. |
| **404** | `Not Found` | Hiển thị trang `SCR-COM-02` (không phân biệt giữa tài nguyên không tồn tại và tài nguyên bị ẩn/Only Me). |
| **409** | `VERSION_CONFLICT` | Mở hộp thoại cảnh báo: "Nội dung chương đã được lưu ở phiên làm việc khác" kèm lựa chọn: *Tải lại bản mới nhất* hoặc *Sao chép nội dung của tôi*. |
| **409** | `RESOURCE_IN_USE` | Toast/Modal cảnh báo tài nguyên đang được bài học tham chiếu kèm danh sách bài học cụ thể, không cho phép xóa. |
| **409** | Khác (`EMAIL_TAKEN`...) | Toast thông báo lỗi với nội dung `detail` của Problem. |
| **429** | `Too Many Requests` | Toast cảnh báo giới hạn thao tác, tự động vô hiệu hóa nút gửi trong 10 giây (kèm đồng hồ đếm ngược). |
| **5xx / Mạng** | Lỗi máy chủ / Mất mạng | Toast đỏ thông báo lỗi máy chủ kèm nút "Thử lại"; các tác vụ dài hiển thị trạng thái Đang xử lý / Thất bại. |

> **Thao tác nguy hiểm:** Xóa khóa học, xóa chương, xóa vĩnh viễn tài nguyên, khóa tài khoản, rút học viên luôn bắt buộc phải có hộp thoại xác nhận (Confirm Dialog), một số trường hợp yêu cầu nhập lại tên đối tượng để xác nhận.

---

## 6. Quy tắc Tải tệp & Thời gian thực

### 6.1. Quy trình tải tệp lên Cloud Storage (DEC-05)
1. **Kiểm tra sơ bộ ở Client:**
   - Ảnh đại diện / Ảnh bìa / Ảnh minh họa: Kích thước $\le 5\text{ MB}$, định dạng cho phép: JPEG, PNG, WebP.
   - Tài liệu / Video / Âm thanh / Tệp đính kèm: Kích thước $\le 20\text{ MB}$, định dạng cho phép: PDF, DOCX, ZIP, MP3, MP4,...
2. **Xin cấp URL tải lên:** Gọi `POST /api/v1/files/upload-urls` với `purpose`, `fileName`, `sizeBytes`, `contentType`. Nhận về `uploadUrl` (Presigned PUT URL) và `uploadKey`.
3. **Tải tệp trực tiếp lên R2/S3:** Thực hiện PUT thẳng lên `uploadUrl` bằng `XMLHttpRequest` để hiển thị thanh tiến trình tải (%) trực quan.
4. **Commit dữ liệu nghiệp vụ:** Gửi `uploadKey` trong payload API nghiệp vụ tiếp theo (Cập nhật hồ sơ, Tạo khóa học, Tạo tài nguyên, Nộp bài tập, Báo cáo vi phạm).
5. **Thời hạn URL xem tệp:** URL tệp trả về trong API là Presigned URL có thời hạn 15 phút; khi hết hạn FE tự refetch query, không cache cố định URL tệp vào bộ nhớ client.

### 6.2. Quy tắc Polling Thời gian thực
| Dữ liệu | Chu kỳ Polling | Điều kiện & Giới hạn |
|:---|:---|:---|
| **Thông báo chưa đọc (`unread-count`)** | Mỗi 30 giây | Chỉ gọi khi tab trình duyệt đang hiển thị (`document.visibilityState === 'visible'`). |
| **Tiến trình sinh AI (`ai/jobs/{id}`)** | Mỗi 2 giây | Polling cho đến khi trạng thái `COMPLETED` hoặc `FAILED`, timeout tối đa sau 3 phút. |
| **Tự động lưu bài thi (Quiz Autosave)** | Debounce 3s | Sau khi chọn đáp án debounce 3 giây; định kỳ tối đa 30s/lần; cảnh báo nếu mất mạng; tự lưu lại khi có mạng trở lại. |
| **Đồng hồ bài thi (Quiz Timer)** | Đồng bộ Client-Server | Tính toán độ lệch ban đầu giữa `serverNow` và `deadlineAt`; đếm ngược ở client; tự động submit bài khi đồng hồ về 0. |

---

## 7. Danh mục Màn hình Chi tiết (Khớp 66 Frame trên Figma UI-BrainMemo-LMS)

Cột **Truy cập**: **G** = Khách vãng lai, **U** = Người dùng đã đăng nhập, **L** = Học viên đang học, **O** = Giảng viên / Chủ khóa học, **A** = Quản trị viên.

### 7.1. Chung, Điều hướng & Xác thực (Common & Identity)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-COM-01** | `Profile menu` & Topbar/Footer | Toàn bộ | Tất cả | `getMe`, `getUnreadCount`, `logout` | Header chung: Logo cam `#ff7a1a`, tìm kiếm `/courses`, chuông thông báo, menu profile dropdown; Khách có CTA Đăng nhập/Đăng ký. |
| **SCR-COM-02** | (Trang 404 Not Found) | `*`, `/404` | Tất cả | – | Giao diện lỗi 404 không tìm thấy nội dung, thông báo tiếng Việt, nút quay về Trang chủ. |
| **SCR-COM-03a** | `Khóa Tài Khoản Tạm Thời` | `/locked` | U | `getMe`, `logout` | Banner cảnh báo vàng/cam, hiển thị rõ lý do vi phạm, thời hạn khóa tạm thời (`lockedUntil`), hướng dẫn khiếu nại. |
| **SCR-COM-03b** | `Khóa TK Vĩnh Viễn` | `/locked` | U | `getMe`, `logout` | Banner cảnh báo đỏ `#ef4444`, thông báo tài khoản bị khóa vĩnh viễn do vi phạm nghiêm trọng, nút đăng xuất về trang chủ. |
| **SCR-AUTH-01** | (Trang Đăng nhập) | `/login` | G | `login`, `loginWithGoogle` | Form đăng nhập Email & Mật khẩu, toggle ẩn/hiện mật khẩu, nút Google OAuth, hỗ trợ `?next=`, bắt lỗi `403 ACCOUNT_LOCKED`. |
| **SCR-AUTH-02** | (Trang Đăng ký) | `/register` | G | `register` | Form đăng ký Họ tên, Email, Mật khẩu chuẩn bảo mật, validate Zod realtime, xử lý `409 EMAIL_TAKEN`, màn hình hướng dẫn kích hoạt email. |
| **SCR-AUTH-03** | (Trang Quên mật khẩu) | `/forgot-password` | G | `forgotPassword` | Nhập email xin cấp lại mật khẩu; luôn hiển thị thông báo an toàn không tiết lộ email tồn tại (FR-IDN-07). |
| **SCR-AUTH-04** | (Trang Đặt lại mật khẩu) | `/reset-password` | G | `resetPassword` | Nhận `token` từ URL; form nhập và xác nhận mật khẩu mới; bắt lỗi token hết hạn/không hợp lệ kèm link gửi lại. |
| **SCR-AUTH-05** | (Trang Xác minh Email) | `/verify-email` | G/U | `verifyEmail` | Tự động gọi API khi tải trang; hiển thị 4 trạng thái: Đang xử lý, Thiếu mã, Thành công (nút Đăng nhập ngay), Lỗi mã. |
| **SCR-AUTH-06a** | `Cài đặt bảo mật` | `/settings/security` | U | `changePassword` | Form đổi mật khẩu: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới; hiển thị lỗi 400 nếu sai mật khẩu cũ. |
| **SCR-AUTH-06b** | `Cài đặt phiên đăng nhập` | `/settings/security` | U | `listSessions`, `revokeSession`, `logoutAll` | Danh sách phiên đăng nhập hoạt động, nhận diện OS/Browser, IP, vị trí, huy hiệu "Thiết bị hiện tại", nút thu hồi từng phiên hoặc tất cả. |

### 7.2. Khám phá & Cổng thông tin (Discovery & Portal)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-DSC-01a** | `Trang chủ - khách` | `/` | G | `getHome` | Hero banner giới thiệu BrainMemo, nút CTA "Bắt đầu học ngay", khối "Khóa học nổi bật", khối "Mới cập nhật". |
| **SCR-DSC-01b** | `Trang chủ - đã đăng nhập` | `/` | U | `getHome`, `getInProgress` | Hero chào mừng cá nhân hóa, khối "Đang học dở" với thanh tiến độ %, khối "Đề xuất cho bạn" (ngẫu nhiên, không cache giữa các lần tải), khối "Mới cập nhật". |
| **SCR-DSC-02** | `Khám phá` | `/courses` | Tất cả | `searchCourses`, `getSearchHistory` | Thanh tìm kiếm từ khóa, lịch sử tìm kiếm (cho U), bộ lọc bên trái (Tags, Public/Private, Trạng thái, Số sao), 6 chế độ sắp xếp, đồng bộ URL parameters. |
| **SCR-DSC-03** | (Trang Top 10) | `/top10` | Tất cả | `getTop10` | Bảng vinh danh Top 10 khóa học theo Số học viên, Tỷ lệ hoàn thành, Điểm đánh giá; tab chuyển đổi Tuần / Tháng / Tất cả. |

### 7.3. Khóa học & Quản lý ghi danh (Course Management)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-CRS-01** | `Trang Giới thiệu khóa học` | `/courses/:courseId` | Tất cả | `getCourse`, `listChapters`, `enroll`, `leaveCourse`, `nominate`, `openConversation` | Chi tiết khóa học (chỉ hiển thị với người khác khi khóa đã `PUBLISHED`): Banner ảnh bìa, giảng viên, chuẩn đầu ra CLO, mục lục chương (Free/Passcode/Enrolled), nhận xét học viên. Nút CTA thông minh theo vai trò: Ghi danh, Học tiếp, Đề cử, **Nhắn tin với giảng viên** (nếu đã ghi danh). |
| **SCR-CRS-02** | `Tạo khóa học` | `/courses/new`, `.../edit` | O | `createCourse`, `updateCourse`, `deleteCourse`, `uploadUrl` | Form tạo/sửa khóa học: Tên, mô tả, tải ảnh bìa lên R2 (≤ 5MB), gắn tag (≤ 10 tags), chọn chế độ (Public, Private, Only Me), trạng thái vận hành, nút xóa khóa học. Khóa mới tạo mặc định là Nháp (`DRAFT`). |
| **SCR-CRS-03** | (Trang Khóa học của tôi) | `/me/courses` | U | `listMyCourses`, `listInvitations`, `acceptInvite` | Quản lý khóa học cá nhân gồm 3 tab: Khóa học đã tạo (hiển thị badge trạng thái xuất bản: Nháp / Chờ duyệt / Đã xuất bản / Bị từ chối), Đang học (Học viên kèm thanh tiến độ %), Lời mời tham gia (Khóa học Private). |
| **SCR-CRS-04** | `Trang chủ Quản lý khóa học` & `Tổng quan khóa học` | `/courses/:courseId/manage` | O | `getCourseStats`, `submitCourseReview`, `cancelCourseReview`, `unpublishCourse` | Trung tâm điều hành khóa học của Giảng viên: Thanh trạng thái xuất bản & nút **Gửi kiểm duyệt xuất bản** / Hủy duyệt / Hủy xuất bản, banner hiển thị lý do nếu Bị từ chối; Thống kê số học viên, điểm trung bình, tỷ lệ hoàn thành; menu dẫn tới quản lý nội dung, đánh giá và **Tin nhắn học viên**. |
| **SCR-CRS-05** | `Trang chủ/ Danh sách học viên` | `.../manage/students` | O | `listEnrollments`, `inviteLearner`, `decideEnrollment`, `removeStudent` | Danh sách học viên chia 4 tab: Đang học, Đã hoàn thành, Chờ duyệt, Đã mời. Chức năng mời qua email, duyệt/từ chối học viên, xóa học viên khỏi khóa. |
| **SCR-CRS-06** | `Sửa Chế độ truy cập chương` | `.../manage/access` | O | `updateCourseAccess`, `setChapterAccess` | Modal & bảng quy tắc truy cập kết hợp giữa Khóa học (Public/Private/Only Me) và từng Chương (Miễn phí, Yêu cầu ghi danh, Có mật khẩu Passcode). Cảnh báo khi chuyển Private/Only Me. |

### 7.4. Quản lý Nội dung - Chương & Blocks (Content Authoring Suite)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-CNT-01** | `Trang chủ/ course_name/Danh sách chương` & `Danh sách chương nháp` | `.../manage/content` | O | `listChapters`, `createChapter`, `reorderChapters`, `deleteChapter` | Danh sách chương học, badge trạng thái (Đã xuất bản, Bản nháp, Có chỉnh sửa), kéo thả reorder thứ tự chương, thêm chương mới, mở nhanh kho tài nguyên, xóa chương an toàn. |
| **SCR-CNT-02** | `Soạn thảo chương` & 5 blocks | `.../manage/content/:chapterId` | O | `getChapterDraft`, `saveChapterDraft`, `publishChapter` | Canvas soạn thảo 10 loại khối (Rich text, Markdown, Ảnh, Video, Audio, File, Flashcard, Câu hỏi, Bài tập, Quiz); Khóa lạc quan (`baseVersionNo` -> `409 VERSION_CONFLICT`); Cảnh báo thay đổi chưa lưu (`isDirty`, `beforeunload`); Nút Xem trước (`view=draft`); Nút Xuất bản. |
| **SCR-CNT-03** | `Xem lịch sử phiên bản` & `Hộp thoại xác nhận khôi phục phiên bản` | Drawer trong CNT-02 hoặc `.../versions` | O | `listVersions`, `restoreVersion` | Drawer trượt bên phải hiển thị danh sách snapshot các phiên bản theo thời gian giảm dần, thông tin người lưu, nút "Khôi phục về bản nháp" kèm hộp thoại xác nhận an toàn. |
| **SCR-CNT-04** | `Ngân hàng câu hỏi` & `Popup Xuất excel` | `.../manage/questions` | O | `listQuestions`, `getQuestionStats`, `exportQuestions` | Danh sách câu hỏi của khóa học, lọc theo Tags, Độ khó, 6 Loại câu hỏi, Trạng thái (Ready/Draft). Popup xuất danh sách câu hỏi ra bảng tính Excel. |
| **SCR-CNT-05** | `Ngân hàng câu hỏi/ Soạn thảo câu hỏi`, `Soạn câu ghép cặp/tự luận` & `Bảng trượt Thông tin sử dụng` | `.../questions/:id` | O | `getQuestion`, `saveQuestion`, `getQuestionUsage` | Form soạn thảo chuẩn cho 6 loại câu hỏi (Trắc nghiệm đơn, Đa đáp án, Đúng/Sai, Điền từ, Ghép cặp, Tự luận ngắn/dài). Bật `READY` khi hợp lệ. Drawer trượt hiển thị danh sách bài thi đang sử dụng câu hỏi này. |
| **SCR-CNT-06** | `Cấu hình bài kiểm tra: Thông tin | Câu hỏi | Đầu ra, ngoại lệ` | Panel trong Block Quiz | O | `saveQuizConfig`, `listClos`, `upsertComponent` | Wizard cấu hình Quiz 3 tab: Tab 1 (Thời gian, số lượt, ngưỡng đạt %, hiển thị kết quả, xáo trộn, mật khẩu); Tab 2 (Chọn câu hỏi thủ công hoặc sinh ngẫu nhiên); Tab 3 (Liên kết chuẩn đầu ra CLO theo DEC-09, ngoại lệ học viên). |
| **SCR-CNT-07** | `Quản lý tài nguyên chi tiết theo khóa học`, `Quản lý tài nguyên` & `Menu chọn nhiều tệp` | `.../manage/resources` & Drawer | O | `listResources`, `uploadUrl`, `createResource`, `deleteResource` | Quản lý kho tài nguyên 2 chế độ (Drawer trong bài soạn & Trang chuyên biệt toàn diện); Phân loại tab (Ảnh ≤ 5MB, Video, Audio, Tệp ≤ 20MB); Thao tác hàng loạt (Chọn nhiều, Tải xuống, Xóa); Bắt lỗi `409 RESOURCE_IN_USE` khi tài nguyên đang được bài học dùng. |
| **SCR-CNT-08** | (Hộp thoại Nhập câu hỏi) | Modal trong CNT-04 | O | `importQuestions` | Modal tải tệp mẫu Excel/Word, kéo thả tải lên, kiểm tra trước dữ liệu, báo cáo chi tiết lỗi theo từng dòng nếu sai định dạng. |
| **SCR-CNT-09** | `Menu thêm ngoại lệ` & Tab Ngoại lệ | `.../quizzes/:blockId/exceptions` | O | `listExceptions`, `upsertException`, `deleteException` | Cấp ngoại lệ làm bài cho học viên đặc biệt: Cộng thêm thời gian làm bài (+15, +30 phút), Thêm lượt làm bài thi, Gia hạn nộp bài. |

### 7.5. Trải nghiệm Học tập (Student Learning Workspace)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-LRN-01** | `Đọc chương khóa học`, `Đọc chương protected`, `Menu chương` & `Flashcard ở trang đọc chương` | `/courses/:courseId/learn/:chapterId?` | G/L | `readChapter`, `completeBlock`, `setBookmark`, `getProgress` | Không gian học tập: Cột trái mục lục chương; Cột giữa nội dung bài học tuần tự các block; Mở block gọi `completeBlock`; Khối Flashcard tương tác lật mặt 3D; Modal Passcode Gate cho chương protected; Nút Bookmark; Khách chỉ đọc. |
| **SCR-LRN-02** | `Block bài kiểm tra` | Trong bài học hoặc `.../quizzes/:blockId` | L | `getQuizInfo`, `listMyAttempts`, `startAttempt` | Thẻ bài kiểm tra hiển thị thời gian, số câu hỏi, ngưỡng đạt, số lượt còn lại, lịch sử điểm thi, nút Bắt đầu làm bài (kèm nhập mật khẩu nếu có). |
| **SCR-LRN-03** | `Làm bài kiểm tra` & `3 mẫu Hộp thoại nộp bài thi` | `/quiz-attempts/:attemptId` | L | `getAttempt`, `saveAnswer`, `submitAttempt` | Giao diện làm bài toàn màn hình; Đồng hồ đếm ngược đồng bộ server, tự nộp khi về 0; Lưới câu hỏi nhảy nhanh, gắn cờ review; Tự động lưu đáp án (debounce 3s); 3 mẫu Hộp thoại nộp bài (Nộp bình thường, Cảnh báo chưa làm hết, Hết giờ). |
| **SCR-LRN-04** | (Trang Kết quả bài thi) | `/quiz-attempts/:attemptId/result` | L | `getAttemptResult` | Hiển thị điểm số, tình trạng Đạt/Không đạt, thời gian làm bài, đáp án và lời giải chi tiết theo cấu hình `resultDisplay`, thông báo "Đang chờ chấm tay" nếu có tự luận. |
| **SCR-LRN-05** | (Trang Nộp bài tập) | `.../assignments/:blockId` | L | `getMySubmission`, `saveDraft`, `submitAssignment` | Đề bài tập, hạn nộp `dueAt`, điểm tối đa, soạn văn bản, tải tệp lên R2, tự động lưu nháp, nhãn "Nộp muộn" (`isLate`), xem điểm và nhận xét của giảng viên. |
| **SCR-LRN-06** | (Hệ thống Hỏi đáp bài học - Lesson Q&A) | Tab Hỏi đáp tại SCR-LRN-01 | L/O | `listChapterQa`, `createQaQuestion`, `replyQaQuestion`, `resolveQaQuestion`, `pinQaQuestion`, `reportComment` | Không gian hỏi đáp gắn chặt với từng bài học (`chapterId`): Bộ lọc (Tất cả, Câu hỏi của tôi, Chưa giải đáp, Đã giải đáp, tìm kiếm từ khóa); Form đặt câu hỏi (Tiêu đề + Nội dung); Nhãn "Giảng viên" cho câu trả lời của Chủ khóa; Nút "Đánh dấu đã giải đáp" (L/O); Ghim câu hỏi (O); Báo cáo vi phạm mở dialog SCR-MOD-06. |
| **SCR-LRN-07** | `Bookmark - vào từ menu profile` | `/me/bookmarks` | L/U | `listMyBookmarks`, `deleteBookmark` | Danh sách bài học và chương đã đánh dấu lưu, phân loại theo khóa học, hiển thị thời gian lưu, liên kết mở trực tiếp bài học để tiếp tục theo dõi. |

### 7.6. Chuẩn đầu ra, Chấm điểm & Bảng điểm (Assessment & OBE Suite)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-AST-01** | `Chuẩn đầu ra/ Quy tắc điểm` | `.../manage/assessment` | O | `getAssessmentConfig`, `updateAssessmentConfig` | Cấu hình thang điểm, ngưỡng đạt khóa học (%), quy tắc chọn điểm lượt thi (Cao nhất, Lần cuối, Trung bình), thang xếp loại học tập, ngưỡng % đạt chuẩn CLO, bật/tắt ma trận PLO. |
| **SCR-AST-02** | `Chuẩn đầu ra/ CLO và PLO` | `.../manage/outcomes` | O | `listClos`, `createClo`, `updateClo`, `deleteClo`, `listPlos` | Quản lý Chuẩn đầu ra học phần (CLO: Mã chuẩn, mô tả, cấp độ Bloom, ánh xạ tới PLO của chương trình đào tạo), modal thêm mới/sửa/xóa CLO. |
| **SCR-AST-03** | `Chuẩn đầu ra/ Ma trận bài đánh giá` | `.../manage/outcomes/mapping` | O | `listAssessableBlocks`, `updateOutcomeMapping` | Bảng ma trận 2 chiều giữa các bài đánh giá (Quiz, Assignment) và các CLO, gán trọng số % đóng góp; cảnh báo mềm nếu tổng trọng số khác 100%. |
| **SCR-AST-04** | `Chấm điểm/ Bài cần chấm` | `.../manage/grading` | O | `listGradingQueue` | Hàng đợi danh sách bài nộp chờ chấm (Câu hỏi tự luận Quiz, Bài tập thực hành Assignment), lọc theo bài học/trạng thái, hiển thị thời gian nộp, tên học viên. |
| **SCR-AST-05** | `Chấm điểm/ Bài cần chấm/ Chi tiết 1 bài` | `.../manage/grading/:kind/:id` | O | `getSubmissionForGrading`, `gradeSubmission` | Không gian chấm bài 2 cột: Cột trái đề bài và nội dung làm bài của học viên; Cột phải barem tiêu chí chấm điểm, ô nhập điểm, nhận xét chi tiết của giảng viên. |
| **SCR-AST-06** | `Dashboard học tập/ Xem chi tiết bảng điểm cá nhân` & `Dashboard học tập` | `/courses/:courseId/gradebook`, `/me/learning-dashboard` | L | `getMyGradebook`, `getLearningStats` | Bảng điểm học viên: Điểm thành phần, Trọng số %, Điểm quy đổi, Điểm tổng kết & Xếp loại; Biểu đồ radar mức độ đạt từng Chuẩn đầu ra (CLO) kèm đóng góp bài làm. |
| **SCR-AST-07** | `Chấm điểm/ Bảng điểm lớp` | `.../manage/gradebook` | O | `getClassGradebook`, `exportGradebook` | Bảng điểm lớp học dạng bảng lưới Excel tổng hợp toàn bộ học viên, các cột điểm thành phần, tổng kết, đạt/chưa đạt; Nút xuất bảng điểm Excel; xem chi tiết bài làm từng học viên. |
| **SCR-AST-08** | (Thống kê Đánh giá) | `.../manage/stats` | O | `getAssessmentStats` | Biểu đồ phân bố điểm số (Histogram), tỷ lệ đạt từng chuẩn đầu ra CLO, tỷ lệ hoàn thành khóa học, phân tích câu hỏi học viên hay làm sai nhất. |
| **SCR-AST-09** | (Quản lý Đánh giá khóa học) | `.../manage/reviews` | Tất cả | `listReviews`, `createReview`, `replyReview` | Danh sách đánh giá 1-5 sao của học viên, lọc theo số sao, phản hồi của giảng viên, gửi đánh giá (chỉ dành cho học viên hoàn thành ≥ 30% khóa học). |

### 7.7. Hồ sơ cá nhân, Quyền riêng tư & Thông báo (Profile & Notifications)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-PRF-01** | `Trang hồ sơ cá nhân công khai` | `/users/:userId` | Tất cả | `getPublicProfile`, `getProfileCourses` | Header hồ sơ cá nhân (Avatar tròn lớn, Họ tên, Danh xưng, Bio, Ngày tham gia); Các tab danh sách khóa học (Đã tạo, Đang học, Hoàn thành); Tôn trọng cờ `showCourseList`. |
| **SCR-PRF-02** | `Cài đặt hồ sơ cá nhân` & `Cài đặt quyền riêng tư và giao diện` | `/settings/profile` | U | `getMyProfile`, `updateMyProfile`, `uploadUrl` | Form chỉnh sửa hồ sơ: Tải ảnh đại diện lên R2 (≤ 5MB), Họ tên, Bio; Tùy chọn Theme (Sáng/Tối/Hệ thống); Bật/tắt cờ riêng tư "Hiển thị danh sách khóa học". |
| **SCR-NTF-01** | `Thông báo drop-down` & `Thông báo đầy đủ` | `/notifications` & Dropdown | U | `listNotifications`, `markRead`, `markAllRead`, `deleteNotification` | Popover nhanh từ chuông thông báo (5 tin mới nhất, icon theo loại tin, nút đánh dấu tất cả đã đọc); Trang xem toàn bộ thông báo phân trang và lọc đã đọc/chưa đọc. |

### 7.8. Trợ lý AI Thông minh (AI Studio)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-AI-01** | `Tạo quiz/ flashcard với AI` (Tab Quiz) | Dialog trong CNT-04 & CNT-02 | O | `createQuizJob`, `getAiJob`, `getAiQuota` | Nhập tài liệu/chủ đề bài học, chọn số lượng câu hỏi, phân bố độ khó, kiểm tra quota AI còn lại, thanh tiến trình xử lý polling 2s, xem trước đề thi trước khi lưu vào ngân hàng. |
| **SCR-AI-02** | `Tạo quiz/ flashcard với AI` (Tab Flashcard) | Dialog trong CNT-02 | O | `createFlashcardJob`, `getAiJob` | Nhập nội dung bài học, chọn số lượng thẻ cần sinh; Các khối thẻ tạo ra có trạng thái ban đầu `PENDING`; Hỗ trợ sửa nội dung và bấm nút "Duyệt" chuyển thành `APPROVED`. |

### 7.9. Quản trị Hệ thống & Xử lý Vi phạm (Admin & Moderation)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-MOD-01** | `Admin/ Tổng quan` | `/admin` | A | `adminGetDashboard` | Bảng điều khiển quản trị: Sidebar trái 288px, thẻ KPI thống kê (Tổng người dùng, Khóa học, Khóa học chờ duyệt xuất bản, Báo cáo vi phạm chờ xử lý), biểu đồ tăng trưởng người dùng & học tập. |
| **SCR-MOD-02** | `Admin/ Hàng đợi báo cáo` | `/admin/reports` | A | `adminListReports` | Bảng danh sách các báo cáo vi phạm do người dùng gửi, lọc theo đối tượng bị báo cáo (Khóa học, Chương, Hỏi đáp Q&A), lý do vi phạm, trạng thái xử lý. |
| **SCR-MOD-03** | `Admin/ Hàng đợi báo cáo/ Chi tiết báo cáo` | `/admin/reports/:id` | A | `adminGetReport`, `adminGetReportTarget`, `adminResolveReport` | Xem nội dung vi phạm dạng chỉ đọc (snapshot), thông tin người báo cáo/bị báo cáo, bằng chứng tệp đính kèm, quyết định xử lý (Bác bỏ, Xóa Q&A, Tạm ẩn khóa, Chuyển sang xử phạt). |
| **SCR-MOD-04** | (Trang Chế tài xử phạt) | `/admin/sanctions` | A | `adminListSanctions`, `adminApplySanction`, `adminLiftSanction` | Danh sách tài khoản đang chịu chế tài; Form áp dụng chế tài mới: Khóa tài khoản tạm thời (nhập hạn), Khóa vĩnh viễn (nhập lý do hiển thị tại SCR-COM-03). |
| **SCR-MOD-05** | `Nhật ký hệ thống` | `/admin/audit-logs` | A | `adminListAuditLogs` | Bảng nhật ký hoạt động hệ thống: Thời gian, Quản trị viên (Actor ID, IP), Loại hành động, Chi tiết thay đổi dữ liệu. |
| **SCR-MOD-06** | `Mẫu popup báo cáo khiếu nại` | Modal tại CRS-01, LRN-01, LRN-06 | L/U | `createReport`, `uploadUrl` | Modal người dùng gửi báo cáo vi phạm: Chọn nhóm lý do (Spam, Xúc phạm, Bản quyền, Sai lệch), nhập mô tả chi tiết, tải ảnh bằng chứng (≤ 5MB), nút "Gửi báo cáo". |
| **SCR-MOD-07** | (Kiểm duyệt xuất bản khóa học) | `/admin/course-reviews` | A | `adminListCourseReviewQueue`, `adminGetCoursePreview`, `adminApproveCourse`, `adminRejectCourse` | Hàng đợi khóa học chờ duyệt xuất bản (`PENDING_APPROVAL`); Drawer xem trước thông tin khóa, giáo trình chương/bài học; Modal xác nhận **Phê duyệt xuất bản** hoặc **Từ chối** kèm lý do bắt buộc. |
| **SCR-ADM-01** | `Admin/ Quản lý người dùng` | `/admin/users` | A | `adminListUsers`, `grantAdmin`, `revokeAdmin`, `sanctionUser` | Bảng danh sách người dùng toàn hệ thống, tìm kiếm theo tên/email, lọc theo vai trò và trạng thái, thao tác Cấp/Hủy quyền Admin, Khóa/Mở khóa tài khoản. |
| **SCR-ADM-02** | `Thông báo hệ thống` | `/admin/announcements` | A | `listAnnouncements`, `createAnnouncement`, `deleteAnnouncement` | Quản lý thông báo phát sóng toàn hệ thống (bảo trì, cập nhật); Form tạo thông báo mới gửi trực tiếp đến chuông thông báo của toàn bộ người dùng. |
| **SCR-ADM-03** | (Cấu hình hệ thống) | `/admin/settings` | A | `adminGetSettings`, `adminUpdateSettings` | Cấu hình các thông số toàn cục: Hạn mức AI (`aiDailyQuota`), nhà cung cấp LLM (`aiLlmProvider`). *(Đã bỏ cấu hình ngưỡng cờ PhoBERT)*. |

### 7.10. Nhắn tin trực tiếp với Giảng viên (Messaging)
| Mã MH | Tên Frame Figma | Route | Quyền | API chính | Mô tả đặc tả giao diện & Tương tác |
|:---|:---|:---|:-:|:---|:---|
| **SCR-MSG-01** | (Chat Drawer với Giảng viên) | Drawer tại SCR-CRS-01 & SCR-LRN-01 | L | `openConversation`, `listMessages`, `sendMessage`, `markRead` | Nút "Nhắn tin với giảng viên" mở ngăn kéo chat ngay trong khóa học/bài học; Hiển thị lịch sử tin nhắn với Chủ khóa, gửi tin nhắn văn bản/đính kèm, tự động đánh dấu đã đọc. |
| **SCR-MSG-02** | (Trung tâm Tin nhắn) | `/me/messages` | U/O | `listConversations`, `listMessages`, `sendMessage`, `markRead` | Giao diện 2 cột: Cột trái danh sách cuộc trò chuyện (kèm tên khóa học, preview tin nhắn cuối, badge số tin chưa đọc); Cột phải khung chat chi tiết giữa học viên và giảng viên. |
| **SCR-ADM-04** | `Admin/ Quản lý khóa học` | `/admin/courses` | A | `adminListCourses`, `adminUpdateCourseStatus` | Bảng danh sách toàn bộ khóa học trên nền tảng, tìm kiếm, lọc theo trạng thái (Public, Private, Only Me), kiểm duyệt khóa học, tạm ẩn hoặc khóa các khóa học vi phạm. |

---

## 8. Trạng thái Màn hình & Trải nghiệm Người dùng (Screen States & Accessibility)

Mọi màn hình và thành phần dữ liệu trong ứng dụng bắt buộc phải triển khai đầy đủ **4 trạng thái cốt lõi**:
1. **Đang tải (Loading State):** Sử dụng Skeleton (`PageSkeleton`, `Skeleton`) có hình dạng và kích thước mô phỏng cấu trúc nội dung thật, không dùng spinner tròn đơn điệu gây giật khung hình.
2. **Dữ liệu trống (Empty State):** Sử dụng component `EmptyState` gồm icon minh họa, tiêu đề giải thích lý do dữ liệu trống, và nút CTA hành động hướng dẫn người dùng tạo mới (ví dụ: "Chưa có khóa học nào. Hãy tạo khóa học đầu tiên của bạn!").
3. **Lỗi (Error State):** Sử dụng component `ErrorState` hiển thị thông điệp lỗi tiếng Việt thân thiện, nút "Thử lại" (Retry), và nếu có lỗi mạng thì hướng dẫn kiểm tra kết nối.
4. **Thành công (Success State):** Hiển thị dữ liệu hoàn chỉnh, phản hồi thao tác thành công bằng `Toast` thông báo ngắn gọn.

### Tiêu chuẩn Tiếp cận & Tương thích (Accessibility & Responsiveness)
- **Chuẩn màu tương phản:** Đạt WCAG AA (độ tương phản tối thiểu 4.5:1 đối với văn bản thông thường và 3:1 đối với văn bản lớn / biểu tượng).
- **Hỗ trợ Bàn phím (Keyboard Accessible):** Mọi nút bấm, dropdown, tab, modal, drawer đều có thể điều hướng bằng phím `Tab`, kích hoạt bằng `Enter` / `Space`, và đóng bằng `Escape`.
- **Thẻ ARIA chuẩn:** Khai báo đầy đủ `aria-label`, `aria-expanded`, `aria-haspopup`, `aria-selected`, `role="dialog"`, `role="treegrid"`.
- **Responsive Web Design:** Tương thích từ màn hình di động nhỏ nhất 360px cho đến màn hình lớn 1440px+ (mobile drawer thay cho desktop sidebar, lưới thẻ khóa học co giãn từ 1 cột trên mobile đến 3–4 cột trên desktop).
- **Hiện đại hóa Web Native (Baseline standards):** Ưu tiên sử dụng Container Queries, Native Dialog/Popover, Subgrid, và View Transitions trước khi cài thêm thư viện phụ thuộc bên thứ 3.

---

## 9. Môi trường, Mock & Tích hợp

- **Chế độ Mock (`VITE_USE_MOCK=true`):** Sử dụng Mock Service Worker (MSW) tại `frontend/mocks/` để chạy độc lập toàn bộ các luồng giao diện với dữ liệu mock chuẩn OpenAPI khi Backend chưa sẵn sàng.
- **Chuyển đổi vai người dùng trong Mock (Mock Persona):** Hỗ trợ chuyển đổi nhanh qua cookie `bm_mock_persona` giữa các vai: `guest`, `user`, `unverified`, `author`, `admin`, `locked`.
- **Chế độ Tích hợp Backend (`VITE_USE_MOCK=false`):** Kết nối API trực tiếp tới Backend qua biến môi trường `VITE_API_BASE_URL=/api/v1` (mặc định proxy qua `http://localhost:5000` trong môi trường dev).

---

## 10. Tiêu chuẩn Hoàn thành Kiểm thử FE (Definition of Done)

Một chức năng hoặc màn hình Frontend được coi là hoàn thành (DoD) khi và chỉ khi:
1. `corepack pnpm --filter frontend typecheck`: 0 lỗi TypeScript (`tsc -b --noEmit`).
2. `corepack pnpm --filter frontend lint`: 0 lỗi, 0 cảnh báo ESLint (`eslint .`).
3. `corepack pnpm --filter frontend format:check`: Đạt chuẩn Prettier format.
4. `corepack pnpm --filter frontend build`: Bản build Vite thành công sạch sẽ, không lỗi bundle.
5. `corepack pnpm --filter frontend test`: Toàn bộ unit và integration test (Vitest + Testing Library + MSW) chạy pass 100%.
6. **Khớp thiết kế Figma:** Giao diện, bố cục, màu sắc, phông chữ và các trạng thái thành phần khớp chính xác với frame tương ứng trong file Figma `UI BrainMemo LMS`.
7. **Đầy đủ 4 trạng thái:** Màn hình xử lý trọn vẹn Loading, Empty, Error, Success.
8. **Handoff note:** Cập nhật tài liệu bàn giao `docs/handoff/<task-id>.md` chi tiết các màn hình, components và luồng nghiệp vụ đã thực hiện.
