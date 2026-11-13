# Handoff Note – T-S2-BE-02

## 1. Thông tin task
- **Task ID:** `T-S2-BE-02` (Batched từ `BE-02 + BE-03 + BE-04`)
- **Mô tả:** Course Module Toàn diện (Batched): Domain & migration `crs_*`, CRUD khóa học, tags ≤10, upload ảnh bìa, xóa mềm, `revision`, Outbox `CourseUpserted`; Phân quyền truy cập 3.5.8.1 `GetCourseAccess` (kèm ModerationReview); Queries danh sách (`GetCourseSummaries`, `ListUserCourses`, `GET /profiles/{id}/courses`, `GET /me/courses`).
- **Nhánh Git:** `feat/T-S2-BE-02-course-module`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** DONE (57/57 tests pass, build 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. Cấu trúc Dự án & Domain Persistence
1. **5 Dự án Module Course:**
   - `BrainMemo.Course.Contracts`: Giao diện hợp đồng `ICourseContract`, DTOs, Enums, Outbox Integration Events (`CourseUpserted`, `CoursePermanentlyDeleted`, `EnrollmentChanged`, `NominationChanged`).
   - `BrainMemo.Course.Domain`: Thực thể cốt lõi `Course` (AggregateRoot), `CourseTag`, `Enrollment`, `EnrollmentRequest`, `ChapterAccess`, `ChapterUnlock`, `Nomination`.
   - `BrainMemo.Course.Application`: Abstractions `ICourseRepository`, Evaluator `CourseAccessEvaluator`, Event Factory `CourseEventFactory`, Commands & Queries CQRS.
   - `BrainMemo.Course.Infrastructure`: DbContext `CourseDbContext`, EF Core Configurations cho 7 bảng `crs_*`, Outbox Message `crs_outbox_event`, Repository `CourseRepository`, Contract Service `CourseContractService`, Migrations `InitialCourse`.
   - `BrainMemo.Course.Api`: Controllers `CoursesController`, `MeCoursesController`, `ProfileCoursesController`, DTOs.
2. **Migration Database (`crs_*`):**
   - Đã sinh EF Core Migration `20261113000002_InitialCourse` và ModelSnapshot tương ứng theo schema chuẩn MySQL 8.

### 2.2. CRUD Khóa học & Xử lý Ảnh bìa (DEC-05, DEC-06)
1. **`POST /api/v1/courses` (`createCourse`):**
   - Yêu cầu xác thực JWT.
   - Kiểm tra email đã xác minh qua `IIdentityContract.GetAccountStatus`: từ chối `EMAIL_NOT_VERIFIED` nếu chưa xác minh (FR-CRS-01).
   - Kiểm tra ảnh bìa upload qua `FileUploadPolicy.ValidateCommittedObject`: bắt buộc ảnh định dạng `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` với dung lượng ≤ 5MB (DEC-05). Commit tệp từ `tmp/{userId}/*` sang `courses/{courseId}/cover.{ext}`.
   - Validate tên khóa học (1..200 ký tự), tags tối đa 10 (mỗi tag ≤ 50 ký tự).
   - Ghi outbox event `CourseUpserted` (mang đầy đủ snapshot nếu `eligible = true`).
2. **`GET /api/v1/courses/{courseId}` (`getCourse`):**
   - Hỗ trợ cả khách vãng lai và người dùng đăng nhập.
   - Phân quyền theo ma trận 3.5.8.1 + DEC-02.
   - **Bảo mật DEC-16:** Ẩn hoàn toàn sự tồn tại của khóa `ONLY_ME`, Tạm ẩn hoặc Đã xóa đối với người ngoài bằng mã HTTP 404 (`COURSE_NOT_FOUND`).
   - Sinh Presigned GET URL cho ảnh bìa với TTL 15 phút (DEC-06).
3. **`PATCH /api/v1/courses/{courseId}` (`updateCourse`):**
   - Chỉ cho phép chủ khóa sở hữu (`FORBIDDEN` nếu người khác).
   - Chặn chuyển sang `ONLY_ME` khi khóa đang bị Tạm ẩn: báo lỗi `ONLY_ME_NOT_ALLOWED` (FR-CRS-03, 05, 06).
   - Tự động tăng `revision` mỗi lần cập nhật.
   - Ghi outbox event `CourseUpserted`.
4. **`DELETE /api/v1/courses/{courseId}` (`deleteCourse`):**
   - Xóa mềm (đặt `deleted_at`, tăng `revision`).
   - Ghi outbox event `CourseUpserted(eligible = false)` (D18 rỗng nội dung).
5. **`GET /api/v1/courses/{courseId}/stats` (`getCourseStats`):**
   - Thống kê học viên active, số lượt đề cử (dành riêng cho chủ khóa).

### 2.3. Ma trận Phân quyền Truy cập (3.5.8.1, DEC-02, DEC-16)
`CourseAccessEvaluator` thực thi đúng tuần tự các bước:
1. **Không tồn tại:** Trả `NOT_FOUND`.
2. **Chủ khóa (`isOwner`):** Cho phép toàn quyền (kể cả khi Tạm ẩn hoặc Xóa mềm), `CanViewInfo = true`, `CanReadContent = true`, `CanLearn = true`, `ReasonCode = "OWNER"`.
3. **`ONLY_ME`:** Từ chối TẤT CẢ mọi người khác, **kể cả Admin và ModerationReview** (`ReasonCode = "ONLY_ME"`).
4. **`purpose == ModerationReview`:** Cho phép đọc chỉ-đọc (`CanReadContent = true`, `CanLearn = false`) đối với Public, Private, Tạm ẩn, Đã xóa (DEC-02).
5. **Tạm ẩn / Đã xóa:** Từ chối người ngoài (`ReasonCode = "COURSE_HIDDEN" / "COURSE_DELETED"`).
6. **`PUBLIC`:** Mọi người được xem info và đọc nội dung; chỉ user đã đăng nhập mới được lưu tiến độ (`CanLearn = true`), khách vãng lai `CanLearn = false`.
7. **`PRIVATE`:** Chỉ học viên có enrollment `ACTIVE` mới được đọc nội dung & học; người ngoài chỉ xem info.
8. **Chương `PROTECTED`:** Yêu cầu unlock với `passcode_version` khớp với phiên bản hiện tại của chương.

### 2.4. Quy tắc Outbox & Quyền Riêng tư D18 (Acceptance Criteria Bắt buộc)
- Khi `course.IsEligible()` là `false` (khóa Private, OnlyMe, Tạm ẩn, hoặc Đã xóa):
  - Event `CourseUpserted` phát ra mang `Eligible = false`, `Revision = course.Revision`.
  - **TẤT CẢ** các trường snapshot nội dung (`Name`, `Description`, `AccessMode`, `Status`, `Tags`, `OwnerUserId`) đều là `null` (D18: không mang nội dung và không nói lý do).
- Khi `course.IsEligible()` là `true` (khóa Public, không ẩn, không xóa):
  - Event `CourseUpserted` mang `Eligible = true` và toàn bộ dữ liệu snapshot đầy đủ.

### 2.5. Queries Danh sách & Hợp đồng Liên module
1. **`GET /api/v1/me/courses` (`listMyCourses`):**
   - Lọc theo `relation = OWNED` (khóa do tôi tạo) hoặc `ENROLLED_ACTIVE` (khóa tôi đang tham gia học).
2. **`GET /api/v1/profiles/{userId}/courses` (`listProfileCourses`):**
   - Kiểm tra cài đặt riêng tư `showCourseList` của profile: nếu người ngoài xem profile đã ẩn danh sách khóa học -> trả danh sách rỗng.
   - Chỉ trả các khóa `PUBLIC`, không bao giờ lộ khóa `ONLY_ME` hay Tạm ẩn / Đã xóa cho người ngoài.
3. **Hợp đồng `ICourseContract`:**
   - `GetCourseAccess`, `CheckChapterAccess`
   - `GetCourseSummaries`: với khóa không xem được trả `Visible = false` và rỗng nội dung.
   - `ResolveReportTarget`: khóa `ONLY_ME` trả `NOT_FOUND` (không thể báo cáo khóa cá nhân người khác không thấy).
   - `HideCourse`, `RestoreCourse` (chỉ gỡ khi khớp `hidden_sanction_id`).
   - `PermanentlyDeleteCourse`: kiểm tra điều kiện chỉ cho phép xóa vĩnh viễn khi khóa đã ở trạng thái Tạm ẩn hoặc Xóa mềm (`INVALID_STATE` nếu chưa).

---

## 3. Tiêu chí nghiệm thu & Kiểm thử (Verification)

### 3.1. Kết quả Kiểm thử Đơn vị (`Course.UnitTests`)
- **Tổng số test:** 57 tests.
- **Kết quả:** 57/57 Passed (100% Passed, 0 Failed, 0 Skipped).
- **Chi tiết các nhóm test:**
  - `CourseDomainTests` (8 tests): Kiểm tra tạo khóa, validation tên ≤ 200, tags ≤ 10, chặn chuyển sang ONLY_ME khi đang ẩn (`ONLY_ME_NOT_ALLOWED`), xóa mềm tăng revision, ẩn/khôi phục khớp sanction ID.
  - `CourseAccessTests` (33 tests): Kiểm tra tham số hóa ma trận phân quyền 3.2.2 & 3.5.8.1 (Not found, Owner, OnlyMe, ModerationReview, Hidden/Deleted, Public, Private, Protected Passcode).
  - `CourseApplicationTests` (16 tests): Kiểm tra tiêu chí nghiệm thu D18 (payload rỗng khi `eligible=false`), kiểm tra xác minh email khi tạo khóa, kiểm tra giới hạn ảnh bìa 5MB qua `FileUploadPolicy`, kiểm tra 404 ẩn khóa bí mật theo DEC-16, kiểm tra tính toàn vẹn của hợp đồng.

### 3.2. Kết quả Build Solution Toàn hệ thống
- **Lệnh build:** `dotnet build backend/BrainMemo.sln` đa luồng mặc định (32 projects).
- **Kết quả:** Build succeeded (0 Warning, 0 Error).

---

## 4. Danh sách tệp thay đổi & tạo mới
- **Contracts:**
  - `backend/src/Modules/Course/BrainMemo.Course.Contracts/BrainMemo.Course.Contracts.csproj`
  - `backend/src/Modules/Course/BrainMemo.Course.Contracts/Enums/CourseEnums.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Contracts/Dtos/CourseContractDtos.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Contracts/Events/CourseIntegrationEvents.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Contracts/ICourseContract.cs`
- **Domain:**
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/BrainMemo.Course.Domain.csproj`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Enums/CourseEnums.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/Course.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/CourseTag.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/Enrollment.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/EnrollmentRequest.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/ChapterAccess.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/ChapterUnlock.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Domain/Entities/Nomination.cs`
- **Application:**
  - `backend/src/Modules/Course/BrainMemo.Course.Application/BrainMemo.Course.Application.csproj`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Abstractions/ICourseRepository.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Common/CourseAccessEvaluator.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Common/CourseEventFactory.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/CreateCourse/CreateCourseCommand.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/CreateCourse/CreateCourseCommandHandler.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/UpdateCourse/UpdateCourseCommand.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/UpdateCourse/UpdateCourseCommandHandler.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/DeleteCourse/DeleteCourseCommand.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Commands/DeleteCourse/DeleteCourseCommandHandler.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/GetCourse/GetCourseQuery.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/GetCourse/GetCourseQueryHandler.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/ListMyCourses/ListMyCoursesQuery.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/ListMyCourses/ListMyCoursesQueryHandler.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/ListProfileCourses/ListProfileCoursesQuery.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Application/Queries/ListProfileCourses/ListProfileCoursesQueryHandler.cs`
- **Infrastructure:**
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/BrainMemo.Course.Infrastructure.csproj`
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/Persistence/CourseDbContext.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/Persistence/CourseRepository.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/Persistence/Configurations/*` (7 configurations)
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/Contracts/CourseContractService.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/CourseModule.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Infrastructure/Migrations/*` (InitialCourse Migration & ModelSnapshot)
- **Api & Host:**
  - `backend/src/Modules/Course/BrainMemo.Course.Api/BrainMemo.Course.Api.csproj`
  - `backend/src/Modules/Course/BrainMemo.Course.Api/DTOs/CourseUpsertRequest.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Api/Controllers/CoursesController.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Api/Controllers/MeCoursesController.cs`
  - `backend/src/Modules/Course/BrainMemo.Course.Api/Controllers/ProfileCoursesController.cs`
  - `backend/src/Host/BrainMemo.WebApi/BrainMemo.WebApi.csproj`
  - `backend/BrainMemo.sln`
- **Tests & Tracking:**
  - `backend/tests/Course.UnitTests/Course.UnitTests.csproj`
  - `backend/tests/Course.UnitTests/CourseDomainTests.cs`
  - `backend/tests/Course.UnitTests/CourseAccessTests.cs`
  - `backend/tests/Course.UnitTests/CourseApplicationTests.cs`
  - `docs/BACKLOG_STATUS.md`
  - `docs/handoff/T-S2-BE-02.md`
