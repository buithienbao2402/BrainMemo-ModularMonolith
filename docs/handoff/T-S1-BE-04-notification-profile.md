# Handoff Note — T-S1-BE-04 (Skeletons & Handlers: Notification + Profile - Batched)

- **Task**: `T-S1-BE-04` (Gộp BE-05 + BE-06 theo Task Batching)
- **Role**: BE
- **Branch**: `feat/T-S1-BE-04-notification-profile`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành trọn vẹn bộ khung Skeleton, Database, CQRS Handlers, Event Handlers và API Endpoints cho hai module **Profile** và **Notification** theo đúng `openapi/modules/profile.yaml`, `openapi/modules/notification.yaml`, `contracts/README.md` và `docs/spec/03-database-design-spec.md`.

---

### A. Profile Module

1. **Domain & Contracts Layer**
   - [`UserProfile`](../../backend/src/Modules/Profile/BrainMemo.Profile.Domain/Entities/UserProfile.cs): Entity quản lý hồ sơ người dùng (`prf_user_profile`), hỗ trợ cập nhật display name, bio, showCourseList, uiTheme (LIGHT/DARK), avatar storage key.
   - [`ProfileDisplayNameGenerator`](../../backend/src/Modules/Profile/BrainMemo.Profile.Domain/Services/ProfileDisplayNameGenerator.cs): Sinh display name mặc định `"Người dùng " + 6 ký tự hex` từ userId (ví dụ: `Người dùng 50D241`), bảo đảm tính xác định (deterministic).
   - [`IProfileContract`](../../backend/src/Modules/Profile/BrainMemo.Profile.Contracts/IProfileContract.cs): Cung cấp `GetPublicProfile(userId)` và `GetDisplayInfo(userIds)` trả về DTO record bất biến cho các module khác gọi đồng bộ.
   - Event [`ProfileUpdated`](../../backend/src/Modules/Profile/BrainMemo.Profile.Contracts/Events/ProfileUpdated.cs): Phát in-process khi người dùng cập nhật hồ sơ.

2. **Application Layer**
   - [`UserRegisteredEventHandler`](../../backend/src/Modules/Profile/BrainMemo.Profile.Application/EventHandlers/UserRegisteredEventHandler.cs): Lắng nghe `UserRegistered` từ Identity, tự động khởi tạo hồ sơ mặc định theo phương thức idempotent (bỏ qua nếu hồ sơ đã tồn tại).
   - [`GetMyProfileQueryHandler`](../../backend/src/Modules/Profile/BrainMemo.Profile.Application/Queries/GetMyProfile/GetMyProfileQueryHandler.cs): Lấy hồ sơ cá nhân hiện tại, hỗ trợ self-healing (tự động tạo hồ sơ mặc định nếu user đã đăng ký bên Identity nhưng chưa có profile record), tạo presigned download URL cho avatar qua `IFileStorage`.
   - [`UpdateMyProfileCommandHandler`](../../backend/src/Modules/Profile/BrainMemo.Profile.Application/Commands/UpdateMyProfile/UpdateMyProfileCommandHandler.cs): Cập nhật thông tin cá nhân, xử lý commit avatar từ `tmp/{userId}/*` sang `avatars/{userId}/*` qua `IFileStorage.Commit` kết hợp `FileUploadPolicy.ValidateCommittedObject`, hỗ trợ xóa avatar (`RemoveAvatar = true`), phát event `ProfileUpdated`.
   - [`GetPublicProfileQueryHandler`](../../backend/src/Modules/Profile/BrainMemo.Profile.Application/Queries/GetPublicProfile/GetPublicProfileQueryHandler.cs): Truy vấn hồ sơ công khai của người dùng khác.

3. **Infrastructure & Persistence Layer**
   - [`ProfileDbContext`](../../backend/src/Modules/Profile/BrainMemo.Profile.Infrastructure/Persistence/ProfileDbContext.cs): Cấu hình EF Core cho bảng `prf_user_profile` (snake_case, UTF8MB4, index `idx_prf_user_created`).
   - Migration [`20261113000001_InitialProfile`](../../backend/src/Modules/Profile/BrainMemo.Profile.Infrastructure/Migrations/20261113000001_InitialProfile.cs) và snapshot model.
   - [`ProfileRepository`](../../backend/src/Modules/Profile/BrainMemo.Profile.Infrastructure/Persistence/ProfileRepository.cs): Triển khai các thao tác persistence `IProfileRepository`.
   - [`ProfileContractService`](../../backend/src/Modules/Profile/BrainMemo.Profile.Infrastructure/Contracts/ProfileContractService.cs): Cung cấp triển khai thực tế của `IProfileContract`.
   - [`ProfileModule`](../../backend/src/Modules/Profile/BrainMemo.Profile.Infrastructure/ProfileModule.cs): Đăng ký DI, MediatR, DbContext, and Contract.

4. **API Endpoints** ([`ProfilesController`](../../backend/src/Modules/Profile/BrainMemo.Profile.Api/Controllers/ProfilesController.cs))
   - `GET /api/v1/profiles/me`: Lấy thông tin hồ sơ của tài khoản đang đăng nhập (kèm presigned avatar URL).
   - `PUT /api/v1/profiles/me`: Cập nhật thông tin hồ sơ và avatar của tài khoản đang đăng nhập.
   - `GET /api/v1/profiles/{userId}`: Lấy thông tin hồ sơ công khai của người dùng.

---

### B. Notification Module

1. **Domain & Contracts Layer**
   - [`Announcement`](../../backend/src/Modules/Notification/BrainMemo.Notification.Domain/Entities/Announcement.cs): Quản trị thông báo hệ thống / broadcast (`ntf_announcement`).
   - [`NotificationItem`](../../backend/src/Modules/Notification/BrainMemo.Notification.Domain/Entities/NotificationItem.cs): Thông báo in-app cho từng học viên (`ntf_notification`), hỗ trợ đánh dấu đã đọc (`MarkAsRead`), xóa mềm (`SoftDelete`).
   - [`EmailDelivery`](../../backend/src/Modules/Notification/BrainMemo.Notification.Domain/Entities/EmailDelivery.cs): Lịch sử và trạng thái gửi email (`ntf_email_delivery`), ghi nhận số lần thử (`AttemptCount`), lỗi gần nhất (`LastError`), thời điểm gửi thành công (`SentAt`). Không lưu token hay bí mật vào DB.

2. **Application Layer & Email Handlers**
   - [`SmtpEmailSender`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Email/SmtpEmailSender.cs): Triển khai `IEmailSender` kết nối Mailpit (mặc định `localhost:1025`) sử dụng `System.Net.Mail.SmtpClient`.
   - [`NotificationEmailBuilder`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Email/NotificationEmailBuilder.cs): Xây dựng nội dung email HTML & PlainText cho 3 template chuẩn:
     1. `EmailVerificationRequested`: Chứa liên kết xác minh email kèm `rawToken` (sử dụng in-memory, không log, không lưu DB/Outbox theo `NFR-04`).
     2. `PasswordResetRequested`: Chứa liên kết đặt lại mật khẩu kèm `rawToken` (in-memory, không log).
     3. `AccountLocked`: Thông báo tài khoản bị khóa kèm lý do và thời hạn.
   - Event Handlers:
     - [`EmailVerificationRequestedEventHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/EventHandlers/EmailVerificationRequestedEventHandler.cs): Lắng nghe `EmailVerificationRequested`, gửi mail xác minh qua `IEmailSender`, ghi nhận lịch sử vào `ntf_email_delivery`, có cơ chế in-memory retry (3 lần, exponential backoff) chống mất mát.
     - [`PasswordResetRequestedEventHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/EventHandlers/PasswordResetRequestedEventHandler.cs): Lắng nghe `PasswordResetRequested`, gửi email đặt lại mật khẩu với cơ chế retry.
     - [`AccountLockedEventHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/EventHandlers/AccountLockedEventHandler.cs): Lắng nghe `AccountLocked`, truy vấn email qua `IIdentityContract`, gửi email thông báo khóa tài khoản.
   - In-app Notification Commands & Queries:
     - [`ListNotificationsQueryHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Queries/ListNotifications/ListNotificationsQueryHandler.cs): Phân trang offset (`PagedResult<NotificationDto>`), hỗ trợ lọc `unreadOnly`.
     - [`GetUnreadCountQueryHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Queries/GetUnreadCount/GetUnreadCountQueryHandler.cs): Đếm số thông báo chưa đọc phục vụ polling frontend.
     - [`MarkNotificationReadCommandHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Commands/MarkNotificationRead/MarkNotificationReadCommandHandler.cs): Đánh dấu 1 thông báo là đã đọc.
     - [`MarkAllNotificationsReadCommandHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Commands/MarkAllNotificationsRead/MarkAllNotificationsReadCommandHandler.cs): Đánh dấu tất cả thông báo của user là đã đọc.
     - [`DeleteNotificationCommandHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Commands/DeleteNotification/DeleteNotificationCommandHandler.cs): Xóa mềm thông báo khỏi view người dùng.
     - [`CreateAnnouncementCommandHandler`](../../backend/src/Modules/Notification/BrainMemo.Notification.Application/Commands/CreateAnnouncement/CreateAnnouncementCommandHandler.cs): Tạo thông báo phát thanh hệ thống từ Admin (`202 Accepted`).

3. **Infrastructure & Persistence Layer**
   - [`NotificationDbContext`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Persistence/NotificationDbContext.cs): Cấu hình EF Core cho 3 bảng `ntf_announcement`, `ntf_notification`, `ntf_email_delivery`.
   - Migration [`20261113000002_InitialNotification`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Migrations/20261113000002_InitialNotification.cs) và snapshot model.
   - Các repositories: [`NotificationRepository`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Persistence/NotificationRepository.cs), [`AnnouncementRepository`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Persistence/AnnouncementRepository.cs), [`EmailDeliveryRepository`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/Persistence/EmailDeliveryRepository.cs).
   - [`NotificationModule`](../../backend/src/Modules/Notification/BrainMemo.Notification.Infrastructure/NotificationModule.cs): Đăng ký DI, MediatR, DbContext, SmtpEmailSender, và Event Handlers.

4. **API Endpoints**
   - [`NotificationsController`](../../backend/src/Modules/Notification/BrainMemo.Notification.Api/Controllers/NotificationsController.cs):
     - `GET /api/v1/notifications`: Danh sách thông báo in-app (phân trang).
     - `GET /api/v1/notifications/unread-count`: Đếm thông báo chưa đọc.
     - `POST /api/v1/notifications/{id}/read`: Đánh dấu đã đọc.
     - `POST /api/v1/notifications/read-all`: Đánh dấu tất cả đã đọc.
     - `DELETE /api/v1/notifications/{id}`: Xóa mềm thông báo.
   - [`AdminAnnouncementsController`](../../backend/src/Modules/Notification/BrainMemo.Notification.Api/Controllers/AdminAnnouncementsController.cs):
     - `POST /api/v1/admin/announcements`: Admin phát thông báo hệ thống (`[Authorize(Roles = "ADMIN")]`).

---

## 2. Kết quả kiểm thử & Tiêu chuẩn hoàn thành (DoD)

1. **Build toàn bộ Solution**
   - Lệnh: `dotnet build backend/BrainMemo.sln`
   - Kết quả: **Build succeeded. 0 Warning(s), 0 Error(s)**. Tất cả 24 dự án biên dịch sạch sẽ.

2. **Kiểm thử Unit Test Module Profile**
   - Lệnh: `dotnet test backend/tests/Profile.UnitTests/Profile.UnitTests.csproj --no-build`
   - Kết quả: **12/12 passed** (100% thành công, 0 failed, 0 skipped).
   - Bao phủ: Domain rules, deterministic default display name generator, self-healing profile initialization, avatar commit & update, public profile queries, contract service.

3. **Kiểm thử Unit Test Module Notification**
   - Lệnh: `dotnet test backend/tests/Notification.UnitTests/Notification.UnitTests.csproj --no-build`
   - Kết quả: **11/11 passed** (100% thành công, 0 failed, 0 skipped).
   - Bao phủ: Domain entities (Announcement, NotificationItem, EmailDelivery), 3 email templates & handlers (`EmailVerificationRequested`, `PasswordResetRequested`, `AccountLocked`) với in-memory retry và idempotency, in-app notification queries & commands (List, UnreadCount, MarkRead, MarkAllRead, SoftDelete), admin announcement.

4. **Kiểm thử Kiến trúc (Architecture Tests)**
   - Lệnh: `dotnet test backend/tests/Architecture.Tests/Architecture.Tests.csproj --no-build`
   - Kết quả: **13/13 passed** (100% thành công). Không vi phạm bất kỳ quy tắc ranh giới layer hay phụ thuộc giữa các module (`*.Contracts` only).

---

## 3. Lưu ý cho downstream (`T-S1-FE-01`, `T-S1-INT-01`, `T-S2-BE-01`)

1. **Cổng Email (Mailpit)**:
   - Cấu hình SMTP trong `Notification:Smtp` (`Host = "localhost"`, `Port = 1025`). Khi chạy Docker Compose dev stack (`infra/docker-compose.dev.yml`), Mailpit UI có sẵn tại `http://localhost:8025` để kiểm tra các email được gửi từ hệ thống.
   - Bí mật/Token email (`rawToken`) được truyền in-memory trực tiếp tới `IEmailSender`, không lưu vào database hay log.
2. **Profile Contract**:
   - Các module hạ tầng tiếp theo (`Course`, `Learning`, `Assessment`, `Discovery`) có thể inject trực tiếp `IProfileContract` để lấy thông tin hiển thị người dùng (`GetDisplayInfo`) và hồ sơ công khai (`GetPublicProfile`).
