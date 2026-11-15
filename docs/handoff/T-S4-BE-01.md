# Handoff Note – T-S4-BE-01

## 1. Thông tin task
- **Task ID:** `T-S4-BE-01` (Batched từ `BE-01 + BE-02`)
- **Mô tả:** Enrollment & Chapter Access Engine (Batched):
  - Ghi danh 5 trạng thái (`PENDING_APPROVAL`, `INVITED`, `ACTIVE`, `LEFT`, `REMOVED`), cập nhật có điều kiện theo bảng 3.5.8.2;
  - Outbox `EnrollmentChanged` (`SELF_ENROLL`, `SELF_REENROLL`, `INVITE_SENT`, `INVITE_ACCEPTED`, `REQUEST_SENT`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `LEFT`, `REMOVED`);
  - Chế độ truy cập chương (`PUBLIC`, `PROTECTED` kèm passcode BCrypt & rate limit brute-force: tối đa 5 lần thử sai trong 15 phút);
  - Hợp đồng truy cập chương theo Ma trận 3.2.2 & 3.5.8.1 (Course Mode × Chapter Mode × Role: Guest, Learner, Owner);
  - Tiêu thụ event `ChapterDeleted` từ Content module (dọn dẹp `crs_chapter_access` & `crs_chapter_unlock`);
  - Quản lý yêu cầu tham gia chờ duyệt (`GET/POST /api/v1/courses/{id}/enrollment-requests`, decide request `POST /api/v1/courses/{id}/enrollment-requests/{requestId}/decision`);
  - Mời học viên (`POST /api/v1/courses/{id}/invitations`, `POST /api/v1/courses/{id}/invitations/accept`, `GET /api/v1/me/invitations`);
  - Mở khóa chương passcode (`POST /api/v1/courses/{id}/chapters/{chapterId}/unlock` & alias `/verify-passcode`, `GET /api/v1/courses/{id}/chapters/{chapterId}/access`).
- **Nhánh Git:** `feat/T-S4-BE-01-enrollment-chapter-access`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** REVIEW (Toàn bộ 81/81 Course tests và 13/13 Architecture tests pass 100%, build 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. Quản lý Vòng đời Ghi danh (Table 3.5.8.2)
1. **Trạng thái ghi danh (5 trạng thái):**
   - `PENDING_APPROVAL`: Người học gửi yêu cầu tham gia khóa học `PRIVATE`. Chờ chủ khóa phê duyệt.
   - `INVITED`: Giảng viên mời người học bằng email. Người học có thể chấp nhận để kích hoạt học tập.
   - `ACTIVE`: Học viên đang học tập chính thức trong khóa học.
   - `LEFT`: Học viên chủ động rời khỏi khóa học. Cho phép tự ghi danh lại (khóa `PUBLIC`) hoặc gửi lại yêu cầu (khóa `PRIVATE`).
   - `REMOVED`: Bị giảng viên đưa ra khỏi khóa học. Học viên bị chặn không được tự ghi danh lại (trả về 403 `LEARNER_REMOVED`), chỉ có thể tham gia lại khi giảng viên gửi lời mời.

2. **Các luồng nghiệp vụ & Outbox Events (`EnrollmentChanged`):**
   - **Tự ghi danh (`POST /api/v1/courses/{id}/enroll`):**
     - Khóa `PUBLIC`:
       - Chưa từng ghi danh: Tạo `Enrollment` trạng thái `ACTIVE`, ghi nhận `FirstEnrolledAt = now`, sinh event action `SELF_ENROLL` (`IsFirstActivation = true`).
       - Đã `ACTIVE`: Idempotent trả về thông tin hiện tại, không sinh event thừa.
       - Từng `LEFT`: Chuyển trạng thái sang `ACTIVE`, sinh event action `SELF_REENROLL` (`IsFirstActivation = false`).
       - Đang `INVITED`: Chuyển trạng thái sang `ACTIVE`, sinh event action `INVITE_ACCEPTED`.
       - Đang `REMOVED`: Từ chối với mã 403 `LEARNER_REMOVED`.
       - Chủ khóa tự ghi danh: Từ chối với mã 400 `CANNOT_ENROLL_OWN_COURSE`.
     - Khóa `PRIVATE`:
       - Chưa từng ghi danh: Tạo `Enrollment` `PENDING_APPROVAL`, tạo `EnrollmentRequest` (`PENDING`), sinh event action `REQUEST_SENT`.
       - Từng `LEFT`: Cập nhật `PENDING_APPROVAL`, tạo `EnrollmentRequest` (`PENDING`), sinh event action `REQUEST_SENT`.
   - **Rời khóa học (`POST /api/v1/courses/{id}/leave`):**
     - Học viên `ACTIVE` chủ động rời khóa học: Chuyển trạng thái sang `LEFT`, sinh event action `LEFT`.
     - Chủ khóa không thể tự rời khóa: Trả về mã 400 `OWNER_CANNOT_LEAVE`.
   - **Xóa học viên (`DELETE /api/v1/courses/{id}/learners/{userId}`):**
     - Chỉ chủ khóa học mới có quyền thực hiện (người khác bị từ chối 403 Forbidden).
     - Không cho phép xóa chủ sở hữu (mã 400 `CANNOT_REMOVE_OWNER`).
     - Chuyển trạng thái sang `REMOVED`, sinh event action `REMOVED`.
   - **Mời học viên (`POST /api/v1/courses/{id}/invitations`):**
     - Chỉ chủ khóa học có quyền mời. Tìm `userId` qua email với `IIdentityContract.FindUserIdByEmail`.
     - Tạo hoặc chuyển trạng thái `Enrollment` sang `INVITED`, sinh event action `INVITE_SENT`.
     - Cho phép mời lại học viên từng bị `REMOVED`.
   - **Chấp nhận lời mời (`POST /api/v1/courses/{id}/invitations/accept`):**
     - Học sinh có lời mời `INVITED` chấp nhận: Trở thành `ACTIVE`, sinh event action `INVITE_ACCEPTED`.
   - **Xem lời mời của tôi (`GET /api/v1/me/invitations`):**
     - Lấy danh sách các khóa học mà người dùng hiện tại đang có lời mời `INVITED`.
   - **Xem danh sách học viên (`GET /api/v1/courses/{id}/enrollments`):**
     - Hỗ trợ lọc theo `status`, phân trang `page` & `pageSize`.
   - **Phê duyệt / Từ chối yêu cầu tham gia (`POST /api/v1/courses/{id}/enrollment-requests/{requestId}/decision`):**
     - Quyết định `ACCEPTED`: Yêu cầu chuyển `ACCEPTED`, `Enrollment` chuyển `ACTIVE`, sinh event action `REQUEST_APPROVED`.
     - Quyết định `REJECTED`: Yêu cầu chuyển `REJECTED`. Nếu là người đăng ký lần đầu thì xóa bản ghi ghi danh; nếu là người từng học trước đó thì chuyển về `LEFT`. Sinh event action `REQUEST_REJECTED`.

---

### 2.2. Động cơ Truy cập Chương & Passcode (Matrix 3.2.2 & 3.5.8.1)
1. **Chế độ bảo vệ chương (`crs_chapter_access`):**
   - Chế độ `PUBLIC`: Bất kỳ ai đủ điều kiện khóa học đều có thể học chương mà không cần passcode.
   - Chế độ `PROTECTED`: Yêu cầu nhập passcode (tối thiểu 4 ký tự).
   - Mã hóa bảo mật passcode: Băm bằng thuật toán `BCrypt` với WorkFactor = 11 (`IPasscodeHasher` & `BCryptPasscodeHasher`).
   - Quản lý phiên bản (`PasscodeVersion`): Mỗi lần chủ khóa cập nhật passcode hoặc đổi mode, `PasscodeVersion` tự động tăng lên 1, vô hiệu hóa các token mở khóa (`crs_chapter_unlock`) cũ.

2. **Mở khóa chương (`POST /api/v1/courses/{id}/chapters/{chapterId}/unlock` & alias `/verify-passcode`):**
   - Chủ sở hữu khóa học: Luôn có quyền truy cập mà không cần nhập passcode.
   - Chương `PUBLIC`: Mặc định thành công, không yêu cầu passcode.
   - Chương `PROTECTED`:
     - Khách vãng lai / chưa ghi danh chính thức (`ACTIVE`): Bị từ chối với mã lỗi `ENROLLMENT_REQUIRED`.
     - Nhập sai passcode: Trả về mã lỗi 400 `INVALID_PASSCODE`.
     - **Chống Brute-Force Rate Limiting (`IPasscodeRateLimiter` & `MemoryPasscodeRateLimiter`):**
       - Khóa chặn IP/UserId theo cặp `(userId, chapterId)`: Nếu nhập sai quá 5 lần liên tiếp trong cửa sổ 15 phút, các lần thử tiếp theo lập tức bị khóa 429 `TOO_MANY_REQUESTS`.
       - Nhập đúng passcode: Reset bộ đếm số lần sai, ghi nhận hoặc cập nhật bản ghi `crs_chapter_unlock` tương ứng với `PasscodeVersion` hiện tại.

3. **Cấu hình quyền truy cập chương (`GET /api/v1/courses/{id}/chapters/{chapterId}/access` & `PUT .../access`):**
   - Cấu hình chỉ cho phép chủ khóa học (`PUT`), tự động kiểm tra sự tồn tại của chương thuộc khóa học qua `IContentContract.GetChapterInfo`.
   - Xem cấu hình (`GET`): Trả về `accessMode` và `passcodeVersion`.

4. **Tiêu thụ Event `ChapterDeleted` từ Content Module (`ChapterDeletedEventHandler`):**
   - Lắng nghe sự kiện `ChapterDeleted` thông qua `IIntegrationEventHandler<ChapterDeleted>`.
   - Tự động dọn dẹp bản ghi cấu hình `crs_chapter_access` và toàn bộ lượt mở khóa `crs_chapter_unlock` liên quan đến `chapterId` bị xóa.

---

## 3. Kiến trúc & Tuân thủ Luật Dự án

1. **Tuân thủ Clean Architecture & Quy tắc Kiến trúc Solution (Rule 1-9):**
   - `BrainMemo.Course.Api` chỉ phụ thuộc vào `Application` và `Contracts`, hoàn toàn **không** phụ thuộc vào `Domain`.
   - Các API endpoints cho thống kê (`GetCourseStats`) được chuyển thành CQRS Query (`GetCourseStatsQuery`) độc lập, loại bỏ việc inject `ICourseRepository` vào controller.
   - DTOs và Enums giao tiếp API chuẩn hóa theo `BrainMemo.Course.Contracts`.
   - Các giao tiếp liên module (`Content`, `Identity`, `Profile`) chỉ đi qua các project `*.Contracts`.

2. **Dữ liệu & Persistence:**
   - Hoàn thiện các phương thức truy vấn và cập nhật trên `CourseRepository` và `ICourseRepository`.
   - Tương thích hoàn toàn với schema MySQL 8 (`crs_enrollment`, `crs_enrollment_request`, `crs_chapter_access`, `crs_chapter_unlock`).

---

## 4. Kết quả Kiểm thử (Test Results)

1. **Course.UnitTests:**
   - 81/81 bài kiểm thử vượt qua (57 bài test Sprint 2 cũ + 24 bài test Sprint 4 mới).
   - Bao quát toàn bộ ma trận chuyển đổi 5 trạng thái ghi danh (Table 3.5.8.2).
   - Bao quát toàn bộ ma trận truy cập chương 3.2.2 & 3.5.8.1: Chủ khóa, Học viên `ACTIVE`, Khách chưa ghi danh, Passcode đúng/sai, Rate limiting 5 lần sai, Đồng bộ phiên bản passcode, Event handler `ChapterDeleted`.

2. **Architecture.Tests:**
   - 13/13 bài kiểm thử kiến trúc vượt qua 100%.
   - Không có vi phạm tham chiếu assembly, không có vi phạm phụ thuộc NetArchTest.

3. **Toàn bộ Solution:**
   - `BuildingBlocks.UnitTests`: 69 passed.
   - `Identity.UnitTests`: 87 passed.
   - `Profile.UnitTests`: 21 passed.
   - `Notification.UnitTests`: 11 passed.
   - `Content.UnitTests`: 84 passed.
   - `Course.UnitTests`: 81 passed.
   - `Architecture.Tests`: 13 passed.
   - **Tổng cộng: 366/366 tests pass 100%, 0 failed, 0 skipped.**
   - **Build status: 0 Warning, 0 Error trên toàn bộ 38 dự án.**

---

## 5. Lưu ý cho Frontend & Integration (FE & INT)
- Header xác thực: Sử dụng JWT bearer token tiêu chuẩn (`sub` hoặc `nameid` tương ứng với `userId`).
- Route mở khóa chương hỗ trợ cả 2 endpoint tương đương:
  - `POST /api/v1/courses/{courseId}/chapters/{chapterId}/unlock`
  - `POST /api/v1/courses/{courseId}/chapters/{chapterId}/verify-passcode` (alias)
- Mã lỗi trả về chuẩn tiếng Việt và mã lỗi nghiệp vụ:
  - `CANNOT_ENROLL_OWN_COURSE` (400)
  - `LEARNER_REMOVED` (403)
  - `ENROLLMENT_REQUIRED` (403)
  - `INVALID_PASSCODE` (400)
  - `TOO_MANY_REQUESTS` (429 - Khóa 15 phút khi nhập sai 5 lần)
  - `NO_PENDING_INVITATION` (400)
  - `REQUEST_ALREADY_DECIDED` (400)
