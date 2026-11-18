# Handoff: T-S9-BE-02 – Course Review, Rating & Discovery Sync

## 1. Trạng thái task
- **Mã task:** `T-S9-BE-02`
- **Trạng thái:** `DONE`
- **Nhánh thực hiện:** `dev/kim-thuan`

## 2. Các tính năng & Endpoints đã hiện thực
### A. Module Assessment (Đánh giá khóa học & Phản hồi)
- **Entities & Persistence:**
  - `CourseReview`: Khóa chính `Id`, `CourseId`, `UserId`, `Rating` (1..5), `Comment` (<= 2000 ký tự), `CreatedAt`, `UpdatedAt`, `InstructorReply`, `RepliedAt`.
  - Ràng buộc Unique `uk_ast_review_course_user` trên (`course_id`, `user_id`): mỗi học viên chỉ có 1 bài đánh giá cho 1 khóa học.
  - Ràng buộc Check `ck_ast_review_rating`: `rating >= 1 AND rating <= 5`.
- **Nghiệp vụ phân quyền & Upsert:**
  - `UpsertCourseReviewCommand`:
    - Học viên phải có quyền học (`CanLearn == true` hoặc trạng thái `ACTIVE`) thông qua `ICourseContract`.
    - Chủ sở hữu khóa học không được tự đánh giá khóa học của mình (`FORBIDDEN`).
    - Nếu đã có bài đánh giá: cập nhật số sao và nhận xét (`CourseReviewUpdated`), cập nhật thời gian sửa.
    - Nếu chưa có: tạo mới bản ghi (`CourseReviewCreated`).
  - `ReplyCourseReviewCommand`:
    - Chỉ giảng viên/chủ khóa học (`IsOwner == true`) mới có quyền phản hồi đánh giá.
    - Phát sinh sự kiện `CourseReviewReplied`.
- **Endpoints:**
  - `GET /api/v1/courses/{courseId}/reviews`: Lấy danh sách đánh giá của khóa học (phân trang, thông tin tác giả, phản hồi của giảng viên).
  - `GET /api/v1/courses/{courseId}/reviews/summary`: Lấy tổng quan điểm đánh giá trung bình, tổng số lượt đánh giá, và phân bổ số lượng từng mức 1..5 sao.
  - `PUT /api/v1/courses/{courseId}/reviews/me`: Tạo hoặc cập nhật đánh giá của học viên hiện tại.
  - `PUT /api/v1/courses/{courseId}/reviews/{id}/reply`: Giảng viên phản hồi bài đánh giá của học viên.

### B. Đồng bộ Discovery & Sự kiện tích hợp
- **Integration Events:**
  - `CourseReviewCreated(EventId, CourseId, ReviewId, UserId, Rating, Comment, CreatedAt)`
  - `CourseReviewUpdated(EventId, CourseId, ReviewId, UserId, OldRating, NewRating, Comment, UpdatedAt)`
  - `CourseReviewReplied(EventId, CourseId, ReviewId, InstructorId, ReplyText, RepliedAt)`
- **Discovery Event Handlers:**
  - `CourseReviewCreatedEventHandler`:
    - Idempotency check thông qua `ICourseActivityFactRepository.ExistsBySourceEventIdAsync(notification.EventId)`.
    - Ghi nhận `CourseActivityFact` với loại `REVIEW_NEW` (giá trị là số sao `Rating`).
    - Tính toán lại `ReviewCount` (tăng 1) và `AvgRating` mới trong danh mục tìm kiếm `CourseEntry`.
  - `CourseReviewUpdatedEventHandler`:
    - Cập nhật lại `AvgRating` trong danh mục `CourseEntry` theo chênh lệch giữa `OldRating` và `NewRating`.

## 3. Kiểm thử & Độ tin cậy
- **Build backend:** `dotnet build backend/BrainMemo.sln` -> 0 Warning(s), 0 Error(s).
- **Unit Tests:**
  - `backend/tests/Assessment.UnitTests/CourseReviewTests.cs`: 8 unit tests bao phủ:
    - Ràng buộc hợp lệ số sao (1..5 sao, ngoài khoảng ném `ArgumentOutOfRangeException`).
    - Giảng viên/chủ sở hữu không thể đánh giá khóa học của chính mình.
    - Học viên chưa đăng ký không được gửi đánh giá.
    - Upsert đánh giá: tạo mới phát sinh `CourseReviewCreated`, cập nhật phát sinh `CourseReviewUpdated`.
    - Phân quyền phản hồi: người không phải chủ sở hữu bị từ chối; chủ sở hữu phản hồi phát sinh `CourseReviewReplied`.
    - Tổng quan phân bổ sao (Rating distribution & Average calculation).
  - `backend/tests/Discovery.UnitTests/DiscoveryUnitTests.cs`:
    - Kiểm tra `CourseReviewCreatedEventHandler` cập nhật `ReviewCount`, `AvgRating`, và tạo fact `REVIEW_NEW` có tính bất biến/idempotent.
  - Kết quả chạy test:
    - `Assessment.UnitTests`: 28/28 passed.
    - `Discovery.UnitTests`: 10/10 passed.
