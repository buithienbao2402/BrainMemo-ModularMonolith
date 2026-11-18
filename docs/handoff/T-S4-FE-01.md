# Handoff Note – T-S4-FE-01

## 1. Thông tin task
- **Task ID:** `T-S4-FE-01` (Batched từ `FE-01 + FE-02`)
- **Mô tả:** FE Enrollment & Learning Player (Batched):
  - `SCR-CRS-05`: Quản lý danh sách học viên (`/courses/:courseId/manage/students`) với 4 tab (Đang học, Đã hoàn thành, Chờ duyệt, Đã mời), duyệt/từ chối yêu cầu tham gia, mời qua email, xóa học viên khỏi khóa.
  - `SCR-CRS-06`: Cấu hình chế độ truy cập (`/courses/:courseId/manage/access`) kết hợp giữa chế độ khóa học (`PUBLIC`, `PRIVATE`, `ONLY_ME`) và bảo vệ từng chương bằng Passcode (BCrypt, rate-limit).
  - `SCR-LRN-01`: Trình đọc bài học Learning Player (`/courses/:courseId/learn` & `/courses/:courseId/learn/:chapterId`) với thanh mục lục chương, hiển thị tiến độ % và hoàn thành block, khối thẻ nhớ Flashcard tương tác 3D Flip, khối câu hỏi thực hành kiểm tra đáp án ngay, modal nhập Passcode khi gặp lỗi 403 `PASSCODE_REQUIRED`, banner Khách chỉ đọc.
  - `SCR-LRN-07`: Trang Bookmark cá nhân (`/me/bookmarks`) hiển thị danh sách bài học đã lưu, phân nhóm theo khóa học, liên kết tiếp tục học trực tiếp và nút bỏ lưu.
  - Cập nhật nút CTA ghi danh, gửi yêu cầu, rời khóa học và tiếp tục học trên `SCR-CRS-01` (`CourseDetailPage.tsx`) và `CourseOverviewPage.tsx`.
- **Nhánh Git:** `dev/kim-thuan`
- **Vai trò:** Frontend Developer (FE)
- **Tình trạng:** DONE (100% build thành công, 0 lỗi TypeScript, 10/10 tests pass)

---

## 2. Các màn hình & thành phần đã phát triển

### 2.1. Quản lý học viên – SCR-CRS-05 (`CourseStudentsPage.tsx`)
- Đường dẫn: `/courses/:courseId/manage/students`
- **4 Tab lọc trạng thái:**
  1. `Đang học` (`ACTIVE`): Danh sách học viên đang tham gia học tập chính thức, hiển thị thời gian ghi danh, nút xóa học viên khỏi khóa.
  2. `Đã hoàn thành` (`COMPLETED`): Học viên đã hoàn thành 100% bài học trong khóa.
  3. `Chờ duyệt` (`PENDING_APPROVAL`): Người học gửi yêu cầu tham gia khóa học `PRIVATE`. Cung cấp 2 nút thao tác nhanh: **Duyệt** (`ACCEPTED`) và **Từ chối** (`REJECTED`).
  4. `Đã mời` (`INVITED`): Danh sách học viên đã được gửi thư mời qua email đang chờ học viên chấp nhận.
- **Mời học viên qua email:** Modal nhập email người học, gọi API `POST /courses/{courseId}/invitations`, phản hồi toast thông báo kết quả.
- **Xác nhận xóa học viên an toàn:** Modal cảnh báo trước khi xóa học viên khỏi khóa, gọi `DELETE /courses/{courseId}/enrollments/{userId}`.

### 2.2. Cấu hình chế độ truy cập – SCR-CRS-06 (`CourseAccessPage.tsx`)
- Đường dẫn: `/courses/:courseId/manage/access`
- **Phân quyền cấp khóa học:**
  - 3 chế độ: `PUBLIC` (Công khai), `PRIVATE` (Riêng tư - Yêu cầu duyệt), `ONLY_ME` (Chỉ mình tôi).
  - Hộp thoại cảnh báo khi người dùng chuyển sang `PRIVATE` hoặc `ONLY_ME`.
  - Cập nhật trực tiếp qua API `PATCH /courses/{courseId}`.
- **Bảo vệ Passcode từng chương:**
  - Bảng danh sách toàn bộ chương học trong khóa với chỉ số thứ tự, tên chương, trạng thái xuất bản và chế độ chương (`Công khai` hoặc `Có mật khẩu`).
  - Modal cấu hình chế độ chương: chuyển đổi giữa `PUBLIC` và `PROTECTED`.
  - Khi bật `PROTECTED`: Nhập Passcode tối thiểu 4 ký tự, cảnh báo việc thay đổi passcode sẽ vô hiệu hóa các lượt mở khóa cũ. Gọi `PUT /courses/{courseId}/chapters/{chapterId}/access`.

### 2.3. Không gian học tập Learning Player – SCR-LRN-01 (`LearningPlayerPage.tsx`)
- Đường dẫn: `/courses/:courseId/learn` & `/courses/:courseId/learn/:chapterId`
- **Thanh mục lục bài học (`LearningSyllabusSidebar.tsx`):**
  - Thu gọn / mở rộng sidebar tiện lợi.
  - Thanh tiến độ khóa học tính theo tỷ lệ hoàn thành các block.
  - Danh sách chương kèm icon trạng thái: Đã hoàn thành (Check xanh), Có mật khẩu (Khóa vàng), hoặc số thứ tự chương.
- **Trình đọc nội dung đa phương tiện (`BlockRenderer.tsx`):**
  - `RICH_TEXT`, `MARKDOWN`: Trình bày nội dung chi tiết.
  - `IMAGE`, `VIDEO`, `AUDIO`, `FILE`: Xem phương tiện và tải tệp tin đính kèm.
  - `FLASHCARD`: Trải nghiệm thẻ nhớ học tập tương tác với hiệu ứng 3D Flip (Perspective 1000px, lật mặt 180° mượt mà), các nút "Lật thẻ", "Thẻ trước", "Thẻ sau" và chỉ số trang thẻ `X/Y`.
  - `QUESTION`: Câu hỏi thực hành tương tác ngay trong bài học, lựa chọn đáp án và bấm nút "Kiểm tra đáp án", chấm điểm và giải thích chi tiết.
  - Đánh dấu hoàn thành block tự động hoặc thủ công (`completeBlock`), cập nhật thanh tiến độ theo thời gian thực.
- **Bảo vệ Passcode chương (`ChapterPasscodeModal.tsx`):**
  - Khi API trả về lỗi 403 `PASSCODE_REQUIRED`, hệ thống tự động hiển thị modal nhập Passcode mở khóa chương.
  - Gọi `POST /courses/{courseId}/chapters/{chapterId}/unlock`.
  - Xử lý mã lỗi `INVALID_PASSCODE` (400) và `TOO_MANY_REQUESTS` (429 khi thử sai quá 5 lần trong 15 phút).
- **Banner Khách chỉ đọc (`GuestBanner.tsx`):**
  - Cảnh báo người dùng khi xem ở chế độ Khách (canSaveProgress = false), kèm nút đăng nhập/đăng ký.
- **Nút Bookmark bài học (`BookmarkButton.tsx`):**
  - Nút lưu/bỏ lưu bài học nhanh ngay trên thanh tiêu đề khóa học.

### 2.4. Khóa học đã lưu – SCR-LRN-07 (`MyBookmarksPage.tsx`)
- Đường dẫn: `/me/bookmarks`
- Danh sách tất cả bài học và chương đã được người dùng lưu lại.
- Nút "Tiếp tục học" mở trực tiếp trình đọc bài học tại chương đã lưu.
- Nút "Xóa" bỏ bookmark khỏi danh sách cá nhân.

---

## 3. Endpoints & API Handlers Đã Tích Hợp
- `GET /api/v1/courses/{courseId}/enrollments`: Lấy danh sách học viên kèm lọc `status`.
- `POST /api/v1/courses/{courseId}/invitations`: Mời học viên qua email.
- `POST /api/v1/courses/{courseId}/enrollment-requests/{requestId}/decision`: Duyệt / từ chối yêu cầu tham gia.
- `DELETE /api/v1/courses/{courseId}/enrollments/{userId}`: Xóa học viên khỏi khóa.
- `GET /api/v1/courses/{courseId}/chapters/{chapterId}/access`: Xem cấu hình truy cập chương.
- `PUT /api/v1/courses/{courseId}/chapters/{chapterId}/access`: Cập nhật access mode và passcode chương.
- `POST /api/v1/courses/{courseId}/chapters/{chapterId}/unlock`: Mở khóa chương protected bằng passcode.
- `GET /api/v1/courses/{courseId}/learn/chapters/{chapterId}`: Đọc nội dung chương bản đăng tải (đã loại bỏ đáp án đúng).
- `POST /api/v1/courses/{courseId}/blocks/{blockId}/complete`: Đánh dấu hoàn thành block.
- `POST /api/v1/courses/{courseId}/blocks/{blockId}/practice-answer`: Kiểm tra kết quả câu hỏi thực hành.
- `GET /api/v1/courses/{courseId}/progress`: Lấy tiến độ tổng thể và tiến độ từng chương.
- `PUT /api/v1/courses/{courseId}/bookmark`: Đặt bookmark cho chương bài học.
- `DELETE /api/v1/courses/{courseId}/bookmark`: Xóa bookmark.
- `GET /api/v1/me/bookmarks`: Lấy danh sách bookmark cá nhân.

---

## 4. Kết quả Kiểm thử
- `pnpm --filter frontend typecheck`: Đạt 100%, 0 lỗi.
- `pnpm --filter frontend vitest run src/features/learning`: 10/10 tests pass 100% trong `learningPlayerSuite.test.tsx`.
