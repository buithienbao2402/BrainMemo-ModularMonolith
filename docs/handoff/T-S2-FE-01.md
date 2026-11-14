# Handoff Note – T-S2-FE-01

## 1. Thông tin task
- **Task ID:** `T-S2-FE-01` [Gộp FE-01 + FE-02]: FE Profile & Course Management (Batched)
- **Màn hình triển khai:**
  - `SCR-PRF-01`: Public Profile (`/users/:userId`)
  - `SCR-PRF-02`: Edit Profile (`/settings/profile`)
  - `SCR-CRS-01`: Course Detail (`/courses/:courseId`)
  - `SCR-CRS-02`: Course Form Create & Edit (`/courses/new`, `/courses/:courseId/edit`)
  - `SCR-CRS-03`: My Courses (`/me/courses`)
- **Nhánh Git:** `feat/T-S2-FE-01-profile-course-ui`
- **Vai trò:** Frontend Developer (FE)
- **Tình trạng:** DONE (100% module vitest pass 16/16, TypeScript typecheck sạch 0 lỗi)

---

## 2. Các thành phần đã triển khai

### 2.1. File Upload Service (DEC-05)
- **File:** `frontend/src/shared/api/fileUpload.ts`
- **Chức năng:**
  - Tiền kiểm tra kích thước phía client: ảnh (Avatar/Cover) $\le 5\text{MB}$, tệp đính kèm $\le 20\text{MB}$.
  - Whitelist định dạng ảnh: JPEG, PNG, WebP.
  - Gọi `POST /files/upload-urls` để lấy Presigned PUT URL và `uploadKey`.
  - Thực hiện upload trực tiếp lên S3/R2 qua `XMLHttpRequest` kèm hỗ trợ tracking tiến trình (`onProgress`).
  - Trả về `uploadKey` phục vụ việc commit ở các endpoint nghiệp vụ tiếp theo (`UpdateMyProfile`, `CreateCourse`, `UpdateCourse`).

### 2.2. Module Profile (`src/features/profile/`)
1. **API & Query Hooks (`api/profileApi.ts`):**
   - `useMyProfileQuery`: Lấy thông tin hồ sơ của người dùng hiện tại (`GET /api/v1/profiles/me`).
   - `useUpdateMyProfileMutation`: Cập nhật tên hiển thị, bio, theme, cờ `showCourseList`, và commit avatar (`PUT /api/v1/profiles/me`).
   - `usePublicProfileQuery`: Xem thông tin công khai của người dùng (`GET /api/v1/profiles/:userId`).
   - `useProfileCoursesQuery`: Danh sách khóa học của người dùng theo vai trò (`OWNED`, `ENROLLED`, `COMPLETED`).
2. **Components & Pages:**
   - `AvatarUpload.tsx`: Component tải ảnh đại diện với preview, thanh tiến trình, kích thước tối đa 5MB và nút gỡ ảnh.
   - `PublicProfilePage.tsx` (`SCR-PRF-01`): Hiển thị header thông tin cá nhân (tên, bio, avatar, ngày tham gia), các tab danh sách khóa học (do tôi soạn thảo, đang học, đã hoàn thành), phân trang và empty/error states. Tôn trọng cờ riêng tư `showCourseList`.
   - `EditProfilePage.tsx` (`SCR-PRF-02`): Biểu mẫu chỉnh sửa thông tin cá nhân với xác thực Zod + React Hook Form, tích hợp `AvatarUpload`, chọn giao diện hiển thị (Sáng/Tối) và bật/tắt hiển thị khóa học.

### 2.3. Module Course (`src/features/course/`)
1. **API & Query Hooks (`api/courseApi.ts`):**
   - `useCourseQuery`: Chi tiết khóa học theo ID (`GET /api/v1/courses/:courseId`).
   - `useCreateCourseMutation` / `useUpdateCourseMutation` / `useDeleteCourseMutation`: Tạo mới, cập nhật, xóa khóa học.
   - `useEnrollMutation` / `useLeaveCourseMutation`: Ghi danh hoặc rời khỏi khóa học.
   - `useNominateCourseMutation` / `useWithdrawNominationMutation`: Đề cử hoặc rút đề cử khóa học (FR-CRS-16).
   - `useMyCoursesQuery`: Danh sách khóa học của tôi theo quan hệ (`OWNED`, `ENROLLED_ACTIVE`, `ENROLLED_COMPLETED`).
   - `useMyInvitationsQuery` / `useAcceptInvitationMutation`: Quản lý và chấp nhận lời mời tham gia khóa học riêng tư.
2. **Components & Pages:**
   - `CourseBadges.tsx`: Huy hiệu chế độ truy cập (`PUBLIC`, `PRIVATE`, `ONLY_ME`) và trạng thái phát hành (`UPDATING`, `COMPLETED`, `PAUSED`).
   - `TagInput.tsx`: Component nhập và gắn tag tương tác (tối đa 10 tags, 50 ký tự/tag).
   - `CourseCoverUpload.tsx`: Tải ảnh bìa khóa học lên S3/R2 với preview trực quan và thanh tiến trình.
   - `CourseCardItem.tsx`: Hiển thị thẻ khóa học responsive kèm thông tin giảng viên, đánh giá, số học viên và thanh tiến độ.
   - `CourseDetailPage.tsx` (`SCR-CRS-01`): Xem chi tiết khóa học, nút Ghi danh / Tiếp tục học tập / Đề cử, tab Tổng quan, Mục lục chương và Đánh giá. Hỗ trợ thao tác dành riêng cho Giảng viên/Tác giả (Chỉnh sửa, Xóa, Cài đặt).
   - `CourseFormPage.tsx` (`SCR-CRS-02`): Tạo mới và chỉnh sửa khóa học, upload cover, gắn tags, chọn chế độ truy cập (Public, Private, Only Me), cảnh báo email chưa xác thực theo FR-CRS-01, modal xác nhận xóa khóa học.
   - `MyCoursesPage.tsx` (`SCR-CRS-03`): Trang tổng quan khóa học cá nhân với 3 tab (Khóa học đã tạo, Đang học, Lời mời tham gia), chấp nhận lời mời trực tiếp và phân trang.

### 2.4. Router & Navigation Integration
- Tích hợp các route mới vào `frontend/src/app/router.tsx`:
  - `/settings/profile`: `EditProfilePage`
  - `/users/:userId`: `PublicProfilePage`
  - `/courses/:courseId`: `CourseDetailPage`
  - `/courses/new`: `CourseFormPage`
  - `/courses/:courseId/edit`: `CourseFormPage`
  - `/me/courses`: `MyCoursesPage`
- Cập nhật menu liên kết trên `SiteHeader.tsx` dẫn tới `/me/courses` và `/settings/profile`.

---

## 3. Tiêu chí nghiệm thu & Kiểm thử (Verification)

### 3.1. TypeScript Typecheck
- **Lệnh chạy:** `pnpm --filter frontend typecheck`
- **Kết quả:** **0 errors (Exit code 0)**

### 3.2. Module Vitest Tests
- **Lệnh chạy:** `pnpm --filter frontend vitest run src/features/profile/ src/features/course/`
- **Kết quả:** **16/16 tests PASS (100%)**
  - `profilePages.test.tsx` (5 tests):
    - `SCR-PRF-01`: Render thông tin cá nhân, ngày tham gia, danh sách khóa học.
    - `SCR-PRF-01`: Ẩn danh sách khóa học khi `showCourseList: false`.
    - `SCR-PRF-01`: Xử lý lỗi 404 khi không tìm thấy người dùng.
    - `SCR-PRF-02`: Tải dữ liệu hồ sơ hiện tại vào form và lưu thay đổi thành công.
    - `SCR-PRF-02`: Hiển thị lỗi xác thực khi tên hiển thị để trống.
  - `coursePages.test.tsx` (11 tests):
    - `SCR-CRS-01`: Render chi tiết khóa học, badges, tags, tabs.
    - `SCR-CRS-01`: Nút CTA Ghi danh cho khách / người chưa ghi danh.
    - `SCR-CRS-01`: Nút quản lý chỉnh sửa/xóa dành cho tác giả khóa học.
    - `SCR-CRS-01`: Xử lý trạng thái lỗi 404 khi khóa học không tồn tại.
    - `SCR-CRS-01`: Bật/tắt đề cử khóa học (nominate).
    - `SCR-CRS-02`: Render form tạo khóa học và kiểm tra validate tên bắt buộc.
    - `SCR-CRS-02`: Tạo mới khóa học thành công với tên và chế độ truy cập hợp lệ.
    - `SCR-CRS-02`: Chế độ chỉnh sửa khóa học với dữ liệu hiện có và modal xóa khóa học.
    - `SCR-CRS-03`: Render 3 tabs cho khóa học đã tạo, đang học và lời mời.
    - `SCR-CRS-03`: Chuyển tab khóa học đang học và kiểm tra danh sách.
    - `SCR-CRS-03`: Xem danh sách lời mời và chấp nhận lời mời tham gia khóa học.

---

## 4. Ghi chú chuyển giao (Handoff Notes)
- Các file mock endpoints trong `frontend/mocks/handlers.ts` đã hỗ trợ đầy đủ các kịch bản của Profile và Course (gồm cả pagination metadata `totalItems`, `totalPages`, `page`, `pageSize`).
- Khi tích hợp API thực tế, đảm bảo backend hỗ trợ endpoint `POST /api/v1/files/upload-urls` và `POST /api/v1/courses/:courseId/invitations/accept`.
