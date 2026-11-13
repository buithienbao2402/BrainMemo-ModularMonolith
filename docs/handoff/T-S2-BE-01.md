# Handoff Note – T-S2-BE-01

## 1. Thông tin task
- **Task ID:** `T-S2-BE-01`
- **Mô tả:** Profile hoàn chỉnh: Cập nhật thông tin + upload avatar (commit `uploadKey` qua S3/R2), `GetPublicProfile`, event `ProfileUpdated`.
- **Nhánh Git:** `feat/T-S2-BE-01-profile-avatar`
- **Vai trò:** Backend Developer (BE)
- **Tình trạng:** DONE (100% tests pass, build 0 warning 0 error)

---

## 2. Các thành phần đã triển khai

### 2.1. API Endpoints & CQRS Handlers
1. **`GET /api/v1/profiles/me`**
   - **Handler:** `GetMyProfileQueryHandler` (`GetMyProfileQuery`)
   - **Chức năng:** Trả về thông tin hồ sơ của người dùng hiện tại (lấy `userId` từ token claims).
   - **Self-healing:** Nếu chưa có bản ghi trong `prf_user_profile`, tự động xác minh người dùng qua `IIdentityContract.GetUserSummary`. Nếu hợp lệ, tự động tạo hồ sơ mặc định với tên `"Người dùng " + 6 hex` ngẫu nhiên (idempotent, không lộ email).
   - **Presigned URL:** Sinh Presigned GET URL cho avatar với TTL 1 giờ (`TimeSpan.FromHours(1)`) theo DEC-06.

2. **`PUT /api/v1/profiles/me`**
   - **Handler:** `UpdateMyProfileCommandHandler` (`UpdateMyProfileCommand`)
   - **Chức năng:** Cập nhật thông tin `displayName` (tối đa 100 ký tự, không rỗng sau trim), `bio` (tối đa 2000 ký tự), `showCourseList`, `uiTheme` (LIGHT/DARK).
   - **Avatar Commit (DEC-05, NFR-08):**
     - Nhận `avatarUploadKey` từ client (client đã PUT lên `tmp/{userId}/*` qua endpoint `/files/upload-urls`).
     - Server gọi `fileStorage.Head(uploadKey)` và kiểm định qua `FileUploadPolicy.ValidateCommittedObject`:
       - Kiểm tra quyền sở hữu: Bắt buộc prefix `tmp/{userId:D}/`, từ chối nếu dùng key của user khác (`FORBIDDEN`).
       - Kiểm tra tồn tại: Tệp phải tồn tại trên storage (`NOT_FOUND`).
       - Whitelist định dạng: Chỉ cho phép ảnh (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) với Content-Type tương ứng (`FILE_TYPE_NOT_ALLOWED`).
       - Giới hạn kích thước: Dung lượng tệp <= 5 MB (`FILE_TOO_LARGE`).
     - Khi hợp lệ, server commit (copy) tệp sang vị trí chính thức `avatars/{userId:D}/{guid}.{ext}` và lưu vào `prf_user_profile.avatar_storage_key`.
   - **Xóa Avatar:** Hỗ trợ cờ `removeAvatar: true` để gỡ bỏ avatar hiện tại về `null`.
   - **Domain Event:** Phát `ProfileUpdated(UserId, DisplayName, AvatarStorageKey)` in-process qua `IEventBus` phục vụ module Discovery đồng bộ read model tên và avatar tác giả.

3. **`GET /api/v1/profiles/{userId}`**
   - **Handler:** `GetPublicProfileQueryHandler` (`GetPublicProfileQuery`)
   - **Chức năng:** Khách hoặc người dùng khác tra cứu hồ sơ công khai của một tài khoản.
   - **Self-healing:** Tương tự `GetMyProfile`, tự khởi tạo hồ sơ nếu tài khoản hợp lệ bên Identity.
   - **Bảo mật riêng tư:** Ẩn theme cá nhân (trả về mặc định `LIGHT`), avatar trả Presigned GET TTL 1 giờ.

### 2.2. Contract Service
- **Interface:** `IProfileContract` (`BrainMemo.Profile.Contracts`)
- **Triển khai:** `ProfileContractService` (`BrainMemo.Profile.Infrastructure.Contracts`)
  - `GetPublicProfile(Guid userId)`: Cung cấp dữ liệu hồ sơ công khai cho các module khác.
  - `GetDisplayInfo(IReadOnlyList<Guid> userIds)`: Tra cứu hàng loạt tên hiển thị và avatar (presigned TTL 1h) cho các module Course, Assessment, Learning, Discovery.

---

## 3. Tiêu chí nghiệm thu & Kiểm thử (Verification)

### 3.1. Kết quả Unit Tests
- **Lệnh chạy:** `dotnet test backend/tests/Profile.UnitTests/Profile.UnitTests.csproj`
- **Kết quả:** **21/21 passed (100%)**
- **Các ca kiểm thử đã phủ:**
  1. `UserRegisteredHandler_ShouldCreateDefaultProfileIdempotently`: Khởi tạo hồ sơ khi nhận event đăng ký người dùng.
  2. `GetMyProfileQueryHandler_WithExistingProfile_ShouldReturnDto`: Tra cứu hồ sơ kèm avatar presigned 1h.
  3. `GetMyProfileQueryHandler_WithMissingProfile_ShouldSelfHeal`: Tự khởi tạo hồ sơ nếu chưa có trong DB.
  4. `UpdateMyProfileCommandHandler_ShouldUpdateFieldsAndPublishEvent`: Cập nhật thông tin và phát `ProfileUpdated`.
  5. `UpdateMyProfileCommandHandler_WithValidAvatarUploadKey_ShouldCommitFileAndGeneratePresignedUrl`: **Commit avatar hợp lệ (kiểm size/đuôi)**, lưu permanent key `avatars/{userId}/*`, phát event và trả presigned URL TTL 1 giờ.
  6. `UpdateMyProfileCommandHandler_WithFileTooLarge_ShouldFailWithFileTooLargeError`: **Kiểm thử tệp quá 5 MB** -> Báo lỗi `FILE_TOO_LARGE`, không commit.
  7. `UpdateMyProfileCommandHandler_WithInvalidFileExtension_ShouldFailWithFileTypeNotAllowedError`: **Kiểm thử đuôi không hợp lệ (`.sh`)** -> Báo lỗi `FILE_TYPE_NOT_ALLOWED`, không commit.
  8. `UpdateMyProfileCommandHandler_WithMismatchedUserIdInUploadKey_ShouldFailWithForbidden`: **Kiểm thử uploadKey của user khác** -> Báo lỗi `FORBIDDEN`.
  9. `UpdateMyProfileCommandHandler_WithFileNotFoundInStorage_ShouldFailWithNotFound`: **Kiểm thử file không tồn tại** -> Báo lỗi `NOT_FOUND`.
  10. `UpdateMyProfileCommandHandler_WithRemoveAvatar_ShouldClearAvatarStorageKey`: Gỡ bỏ avatar thành công.
  11. `GetPublicProfileQueryHandler_WithExistingProfile_ShouldReturnPublicDto`: Đọc hồ sơ công khai thành công.
  12. `GetPublicProfileQueryHandler_WithMissingProfile_ShouldSelfHealIfUserExistsInIdentity`: Self-heal hồ sơ công khai.
  13. `GetPublicProfileQueryHandler_WhenUserDoesNotExist_ShouldReturnNotFound`: Trả `NOT_FOUND` nếu user không tồn tại.
  14. `ProfileContractService_GetPublicProfile_ShouldSelfHealAndReturnDto`: Kiểm thử self-heal qua contract.
  15. `ProfileContractService_GetDisplayInfo_ShouldBatchLookupUsers`: Tra cứu hàng loạt danh sách thông tin người dùng.
  16. 6 Unit tests cho Domain Entity & DisplayNameGenerator.

### 3.2. Solution Build
- **Lệnh chạy:** `dotnet build backend/BrainMemo.sln` (đa luồng mặc định)
- **Kết quả:** **Build succeeded. 0 Warning(s), 0 Error(s)**.

---

## 4. Điểm cần lưu ý cho Downstream (`T-S2-FE-01`, `T-S2-INT-01`, `T-S2-BE-02`)
1. **Quy trình upload avatar phía Frontend:**
   - Bước 1: FE gọi `POST /api/v1/files/upload-urls` với `{ purpose: "AVATAR", fileName: "avatar.png", sizeBytes: 123456, contentType: "image/png" }` để nhận `uploadUrl` và `uploadKey`.
   - Bước 2: FE thực hiện HTTP `PUT` thẳng binary dữ liệu ảnh lên `uploadUrl`.
   - Bước 3: FE gọi `PUT /api/v1/profiles/me` gửi kèm `{ avatarUploadKey: "<uploadKey>" }` để Backend kiểm tra kích thước/đuôi tệp và commit vào hồ sơ.
2. **Quyền riêng tư & Presigned URL:**
   - DEC-05 / DEC-06: Toàn bộ avatar lưu trữ tại bucket private, không public trực tiếp URL bucket. API luôn trả Presigned GET URL có thời hạn hiệu lực 1 giờ (`TTL = 3600s`).
