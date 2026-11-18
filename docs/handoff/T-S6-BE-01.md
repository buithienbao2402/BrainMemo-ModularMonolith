# Handoff Task T-S6-BE-01: Comments & In-App Notifications (Batched)

## 1. Mục tiêu và phạm vi đã hoàn thành
- **Comments (Learning Module):**
  - Thực thể `Comment` (`lrn_comment`) hỗ trợ bình luận gốc, bình luận theo chương/khóa, trả lời lồng tối đa 1 cấp, sửa bình luận (tác giả), xóa mềm (tác giả), ghim/bỏ ghim (chỉ Chủ khóa).
  - Khóa ngoại tự tham chiếu `parent_comment_id` với kiểm tra nghiêm ngặt: cùng khóa, cùng chương, không cho phép trả lời của trả lời (tối đa 1 cấp nesting).
  - Phân quyền ghim: Chỉ Chủ khóa (`ICourseContract.GetCourseAccess`) mới có quyền ghim hoặc bỏ ghim bình luận.
  - Sự kiện: Phát `CommentCreated` khi tạo bình luận, `CommentDeleted` khi xóa bình luận.
  - Contract `ILearningContract`: Cung cấp `ResolveReportTarget`, `SoftDeleteComment`, `RestoreComment`, `GetCourseLearningStats`.
  - API Endpoints:
    - `GET /api/v1/courses/{courseId}/comments`: Danh sách bình luận gốc kèm trả lời (<= 1 cấp), bình luận ghim lên đầu (`is_pinned DESC, created_at DESC`), phân trang (`items`, `meta: {page, pageSize, totalItems, totalPages}`).
    - `POST /api/v1/courses/{courseId}/comments`: Tạo bình luận / trả lời.
    - `PATCH /api/v1/comments/{id}`: Chỉnh sửa bình luận của mình.
    - `DELETE /api/v1/comments/{id}`: Xóa mềm bình luận của mình.
    - `PUT /api/v1/comments/{id}/pin`: Ghim bình luận (Chủ khóa).
    - `DELETE /api/v1/comments/{id}/pin`: Bỏ ghim bình luận (Chủ khóa).
    - `GET /api/v1/courses/{courseId}/comments/summary`: Thống kê bình luận (`totalComments`, `rootComments`, `pinnedComments`).

- **In-App Notification Engine (Notification Module):**
  - Bộ handler tự động theo Bảng sự kiện 3.4.6.1:
    - `EnrollmentChangedEventHandler`: Nhận sự kiện `EnrollmentChanged` từ Course Module. Xác định người nhận (`studentUserId` hoặc `ownerUserId` tùy theo hành động `INVITED`, `REQUEST_CREATED`, `APPROVED`, `JOINED`, `LEFT`, `REMOVED`). Loại thông báo: `ENROLLMENT_INVITE_JOIN` hoặc `ENROLLMENT`.
    - `CommentCreatedEventHandler`: Nhận sự kiện `CommentCreated` từ Learning Module. Gửi thông báo đến Chủ khóa (cho bình luận gốc) hoặc Tác giả bình luận gốc (cho phản hồi). Bỏ qua tự gửi thông báo cho chính người đăng bình luận.
    - `ChapterPublishedEventHandler`: Nhận sự kiện `ChapterPublished` từ Content Module. Khi `IsFirstPublish == true`, phân trang danh sách học viên đang học qua `ICourseContract.ListActiveLearnerIds` và gửi thông báo `NEW_CHAPTER` cho từng học viên.
  - Idempotency: Kiểm tra chống trùng theo `(source_event_id, recipient_user_id)` qua `ExistsByEventAndRecipientAsync` và ràng buộc `uk_ntf_notification_event_recipient`.
  - Khả năng chịu lỗi: Bọc toàn bộ xử lý trong khối try-catch an toàn, lỗi không rollback nghiệp vụ chính (best-effort theo FR-NTF-01).
  - Tương thích MySQL ENUM: Bổ sung bộ chuyển đổi chuỗi chữ hoa snake_case (`NotificationTypeValueConverter`) tương ứng với định nghĩa schema `ntf_notification.type`.

## 2. Kiểm thử tự động đã thực hiện
- `dotnet test backend/tests/Learning.UnitTests/`: 15/15 passed 100% (bao gồm kiểm tra ràng buộc cha cùng khóa/chương, chỉ Chủ khóa được ghim, nesting tối đa 1 cấp).
- `dotnet test backend/tests/Notification.UnitTests/`: 15/15 passed 100% (bao gồm kiểm tra tính idempotent, đúng người nhận, bỏ qua khi tác giả tự bình luận, chỉ gửi chương mới khi là lần đầu đăng tải).
- `dotnet build backend/BrainMemo.sln`: 0 Warning(s), 0 Error(s).

## 3. Điểm cần lưu ý cho Frontend và Tích hợp (FE & INT)
- API bình luận trả về đối tượng `author: { id, displayName, avatarUrl }` và mảng `replies` lồng bên trong mỗi bình luận gốc.
- Khi người dùng phản hồi một bình luận, gửi `parentCommentId`. Nếu gửi `parentCommentId` của một bình luận con (đã là reply), backend sẽ trả về lỗi `400 VALIDATION_FAILED: Chỉ được trả lời bình luận tối đa 1 cấp`.
- Ghim bình luận chỉ thành công khi tài khoản là Chủ khóa (người tạo khóa học).
