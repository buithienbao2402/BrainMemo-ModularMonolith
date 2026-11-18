# Handoff Note – T-S5-BE-01

## 1. Thông tin task
- **Task ID:** `T-S5-BE-01` (Gốc `BE-01..03` trọn gói Discovery)
- **Mô tả:** Discovery Module Trọn gói:
  - Khởi tạo kiến trúc và cấu hình CSDL `dsc_*` (`dsc_course_entry`, `dsc_course_activity_fact`, `dsc_search_history`).
  - Xử lý các Integration Event: `CourseUpserted`, `CoursePermanentlyDeleted`, `ChapterPublished`, `ChapterDeleted`, `EnrollmentChanged`, `NominationChanged`, `ProfileUpdated`, `CommentCreated`.
  - Nghiệm thu: `eligible=false` xóa dòng khỏi `dsc_course_entry`; event cũ/muộn (`revision <= source_revision`) bị bỏ qua; fact `source_event_id` idempotent.
  - Discovery là bên tiêu thụ thuần: không phát event, không gọi Course trong luồng đọc.
  - API Trang chủ (`GET /api/v1/discovery/home`): mới cập nhật, đề xuất ngẫu nhiên mỗi lần tải độc lập người dùng (FR-DSC-02), đang học dở (nếu đăng nhập).
  - API Tìm kiếm & Lọc (`GET /api/v1/discovery/courses`): lọc từ khóa q (tìm theo tên, chủ khóa, mô tả), tag, accessMode, status; 6 tiêu chí sắp xếp; phân trang <= 50; tự động ghi lịch sử khi đăng nhập.
  - API Top 10 (`GET /api/v1/discovery/top10`): tính trực tiếp từ fact theo metric (LEARNERS, REVIEWS, NOMINATIONS) và window (WEEK, MONTH, ALL_TIME), tự động khấu trừ đề cử bị rút (`NOMINATION_WITHDRAWN`).
  - API Lịch sử tìm kiếm (`GET /api/v1/discovery/search-history`): lấy lịch sử người dùng đã đăng nhập.
  - API Xếp hạng khóa học (`GET /api/v1/courses/{courseId}/ranking` & `GET /api/v1/discovery/courses/{courseId}/ranking`): xếp hạng khóa học theo số học viên, số đề cử, số đánh giá.
  - Rebuild Read Model Service (`POST /api/v1/discovery/rebuild`): tái tạo dữ liệu `dsc_course_entry` từ snapshots của Course module.
- **Nhánh Git:** `dev/kim-thuan`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** DONE (100% Discovery unit tests passed, build solution 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. Cấu trúc Dự án & CSDL
- Tạo đầy đủ 5 projects: `BrainMemo.Discovery.Contracts`, `BrainMemo.Discovery.Domain`, `BrainMemo.Discovery.Application`, `BrainMemo.Discovery.Infrastructure`, `BrainMemo.Discovery.Api`.
- Đăng ký vào `BrainMemo.sln` và tham chiếu trong `BrainMemo.WebApi`.
- `DiscoveryDbContext` cấu hình 3 bảng:
  - `dsc_course_entry`: Read model khóa học Public/Private đủ điều kiện hiển thị.
  - `dsc_course_activity_fact`: Sự kiện hoạt động có timestamp (ghi danh, đề cử, rút đề cử) phục vụ tính Top 10.
  - `dsc_search_history`: Lịch sử tìm kiếm của người dùng đã đăng nhập.

### 2.2. Xử lý Event (Idempotent & Revision Control)
1. `CourseUpsertedEventHandler`:
   - `eligible == false`: Ngay lập tức xóa dòng khỏi `dsc_course_entry`.
   - `revision <= source_revision`: Bỏ qua event cũ đến muộn.
   - `revision > source_revision`: Upsert thông tin khóa học, giải quyết tên chủ khóa qua `IProfileContract`.
2. `CoursePermanentlyDeletedEventHandler`:
   - Xóa sạch cả dòng read model `dsc_course_entry` và toàn bộ fact liên quan trong `dsc_course_activity_fact`.
3. `EnrollmentChangedEventHandler`:
   - Kiểm tra `source_event_id` trên fact chống xử lý trùng lặp.
   - Khi chuyển sang `ACTIVE`: Lưu fact `ENROLLMENT_NEW`, tăng `learner_count`.
   - Khi rời khỏi `ACTIVE`: Giảm `learner_count`.
4. `NominationChangedEventHandler`:
   - Kiểm tra `source_event_id` trên fact chống trùng lặp.
   - Khi `IsActive == true`: Lưu fact `NOMINATION_NEW`, tăng `nomination_count`.
   - Khi `IsActive == false`: Lưu fact `NOMINATION_WITHDRAWN`, giảm `nomination_count`.
5. `ProfileUpdatedEventHandler`:
   - Đồng bộ `owner_display_name` cho tất cả khóa học của tác giả.
6. `ChapterPublishedEventHandler` & `ChapterDeletedEventHandler`:
   - Cập nhật `published_chapter_count` và `first_published_at`.
7. `CommentCreatedEventHandler`:
   - Tăng `comment_count` cho khóa học tương ứng.

### 2.3. Endpoints API
- `GET /api/v1/discovery/home`:
  - `recentlyUpdated`: Top 10 khóa học có `last_updated_at DESC`.
  - `recommended`: 10 khóa học ngẫu nhiên mỗi lần tải (FR-DSC-02).
  - `inProgress`: Các khóa học người dùng đang học dở qua `ILearningContract.ListInProgressCourses`.
- `GET /api/v1/discovery/courses`:
  - Hỗ trợ tham số: `q`, `tag`, `accessMode`, `status`, `sort`, `page`, `pageSize`.
  - 6 tiêu chí sắp xếp: `RECENTLY_UPDATED`, `NEWEST_LAUNCH`, `MOST_REVIEWED`, `MOST_NOMINATED`, `MOST_LEARNERS`, `MOST_COMMENTED`.
  - Tự động ghi vào `dsc_search_history` nếu người dùng đã đăng nhập.
- `GET /api/v1/discovery/top10`:
  - Tham số bắt buộc: `metric` (LEARNERS, REVIEWS, NOMINATIONS), `window` (WEEK, MONTH, ALL_TIME).
  - Trừ đi đề cử bị rút trong kỳ tính toán đối với metric NOMINATIONS.
- `GET /api/v1/discovery/search-history`:
  - Trả về danh sách chuỗi tìm kiếm gần nhất của người dùng.
- `GET /api/v1/courses/{courseId}/ranking`:
  - Tính thứ hạng của khóa học so với tất cả các khóa đủ điều kiện hiện có.
- `POST /api/v1/discovery/rebuild`:
  - Quét snapshot từ `ICourseContract.ListCourseSnapshots` để tái tạo read model.

---

## 3. Kết quả Kiểm thử

- **Build Solution:**
  `dotnet build backend/BrainMemo.sln` đa luồng mặc định: **Build succeeded. 0 Warning(s), 0 Error(s)**.
- **Discovery.UnitTests:**
  `dotnet test backend/tests/Discovery.UnitTests/`: **8/8 tests passed (100% xanh)**:
  - `CourseUpserted_WhenEligibleIsFalse_DeletesEntryFromDatabase`: Pass.
  - `CourseUpserted_WhenRevisionIsLowerOrEqual_StaleEventIsIgnored`: Pass.
  - `CoursePermanentlyDeleted_DeletesBothEntryAndActivityFacts`: Pass.
  - `EnrollmentAndNomination_UpdateFactsAndCountsIdempotently`: Pass.
  - `SearchCourses_FiltersAndSortsCorrectly`: Pass.
  - `Top10_DeductsWithdrawnNominationsAndCalculatesAccurately`: Pass.
  - `SearchHistory_SavedOnlyWhenUserIsAuthenticated`: Pass.
  - `CourseRanking_ComputesCorrectRanks`: Pass.
