# Handoff Note — T-S1-BE-04 (ForgotPassword / ResetPassword / ChangePassword / GetMe)

- **Task**: `T-S1-BE-04`
- **Role**: BE
- **Branch**: `feat/T-S1-BE-04-password-flows-me`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành cụm tính năng quên mật khẩu, đặt lại mật khẩu, đổi mật khẩu và xem thông tin tài khoản hiện tại cho module **Identity** theo đúng [`openapi/modules/identity.yaml`](../../openapi/modules/identity.yaml), `THIET_KE_CSDL §3.1.6.1` và `NFR-04`:

1. **Domain Layer** ([`BrainMemo.Identity.Domain`](../../backend/src/Modules/Identity/BrainMemo.Identity.Domain/BrainMemo.Identity.Domain.csproj))
   - [`UserToken`](../../backend/src/Modules/Identity/BrainMemo.Identity.Domain/Entities/UserToken.cs): thêm phương thức `Invalidate(DateTimeOffset utcNow)` gán `ConsumedAt = utcNow` an toàn cho các token chưa tiêu thụ.
   - [`User`](../../backend/src/Modules/Identity/BrainMemo.Identity.Domain/Entities/User.cs): thêm phương thức `InvalidateTokens(UserTokenPurpose purpose, DateTimeOffset utcNow)` vô hiệu hóa nguyên tử toàn bộ token còn hiệu lực cùng purpose của người dùng.

2. **Application Layer** ([`BrainMemo.Identity.Application`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/BrainMemo.Identity.Application.csproj))
   - Mở rộng [`IIdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Abstractions/IIdentityAuthRepository.cs) với `InvalidateUserTokensAsync(Guid userId, UserTokenPurpose purpose, DateTimeOffset utcNow, CancellationToken ct)`.
   - `POST /api/v1/auth/forgot-password` -> [`ForgotPasswordCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ForgotPassword/ForgotPasswordCommand.cs), [`ForgotPasswordCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ForgotPassword/ForgotPasswordCommandValidator.cs), [`ForgotPasswordCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ForgotPassword/ForgotPasswordCommandHandler.cs):
     - Luôn trả `204 No Content` ngay cả khi email không tồn tại hoặc tài khoản đang bị khóa để chống lộ danh sách tài khoản (`NFR-04`).
     - Khi người dùng tồn tại: vô hiệu hóa toàn bộ token `UserTokenPurpose.ResetPassword` cũ trước đó trong DB và aggregate; phát hành token mới với TTL cấu hình (`IdentityOptions.PasswordResetTokenTtl`, mặc định 1 giờ); đẩy event `PasswordResetRequested` vào `IPostCommitEventQueue` strictly sau commit (raw token chỉ tồn tại trong bộ nhớ).
   - `POST /api/v1/auth/reset-password` -> [`ResetPasswordCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ResetPassword/ResetPasswordCommand.cs), [`ResetPasswordCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ResetPassword/ResetPasswordCommandValidator.cs), [`ResetPasswordCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ResetPassword/ResetPasswordCommandHandler.cs):
     - Tiêu thụ token nguyên tử qua `TryConsumeUserTokenAsync(UserTokenPurpose.ResetPassword)`. Token sai, đã dùng hoặc hết hạn trả `400 TOKEN_INVALID_OR_EXPIRED`.
     - Cập nhật hash mật khẩu mới (BCrypt); tự gỡ khóa tạm thời nếu đã hết hạn; vô hiệu các token reset khác của user; thu hồi toàn bộ phiên đăng nhập đang hoạt động (`SessionRevokeReason.LogoutAll`) bảo đảm phiên cũ bị vô hiệu ngay lập tức.
   - `POST /api/v1/auth/change-password` -> [`ChangePasswordCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ChangePassword/ChangePasswordCommand.cs), [`ChangePasswordCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ChangePassword/ChangePasswordCommandValidator.cs), [`ChangePasswordCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/ChangePassword/ChangePasswordCommandHandler.cs):
     - Xác thực người dùng hiện tại qua JWT `sub`; kiểm tra `account_status` (bị khóa -> 403 `ACCOUNT_LOCKED`).
     - Xác thực mật khẩu cũ qua `BCryptPasswordHasher.Verify` (sai -> 401 `INVALID_CREDENTIALS`).
     - Cập nhật hash mật khẩu mới; thu hồi toàn bộ phiên đang hoạt động (`SessionRevokeReason.LogoutAll`) và xóa cookie refresh tại controller.
   - `GET /api/v1/auth/me` -> [`GetMeQuery`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Queries/GetMe/GetMeQuery.cs), [`GetMeQueryHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Queries/GetMe/GetMeQueryHandler.cs):
     - Trả về `CurrentUserDto` (`id`, `email`, `emailVerified`, `isAdmin`, `accountStatus`) của người dùng hiện tại.
   - Toàn bộ Command/Query đều ghi đè `ToString()` giấu token và mật khẩu (`[REDACTED]`).

3. **Infrastructure Layer** ([`IdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Persistence/IdentityAuthRepository.cs))
   - Triển khai `InvalidateUserTokensAsync` cập nhật có điều kiện `UPDATE idn_user_token SET consumed_at = @utcNow WHERE user_id = @userId AND purpose = @purpose AND consumed_at IS NULL`.
   - `SaveUserAsync`: lưu đồng thời cả `user.RefreshSessions` và `user.Tokens` mới được thêm vào aggregate.

4. **API Layer** ([`AuthController`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/AuthController.cs))
   - Thêm 4 action: `POST forgot-password` (204), `POST reset-password` (204), `POST change-password` (204), `GET me` (200 `CurrentUserResponse`).
   - Cung cấp DTO request: [`ForgotPasswordRequest`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/ForgotPasswordRequest.cs), [`ResetPasswordRequest`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/ResetPasswordRequest.cs), [`ChangePasswordRequest`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/ChangePasswordRequest.cs).

## 2. Kiểm thử & Chất lượng đã chạy

- `dotnet format backend/BrainMemo.sln --no-restore --include backend/src/Modules/Identity backend/tests/Identity.UnitTests backend/tests/Identity.IntegrationTests` -> **Exit 0**
- `dotnet build backend/BrainMemo.sln -c Release --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1` -> **Build succeeded. 0 Warning(s), 0 Error(s)**
- Sequential `dotnet test` (`-c Release --no-build`):
  - `Architecture.Tests`: **13/13 passed** (`0` failed, `0` skipped)
  - `BuildingBlocks.UnitTests`: **69/69 passed** (`0` failed, `0` skipped)
  - `WebApi.Tests` (`--filter "FullyQualifiedName!~MinioIntegrationTests"`): **59/59 passed** (`0` failed, `0` skipped)
  - `Identity.UnitTests`: **87/87 passed** (`0` failed, `0` skipped; bao gồm 30 unit tests mới trong [`PasswordFlowsAndGetMeTests`](../../backend/tests/Identity.UnitTests/Auth/PasswordFlowsAndGetMeTests.cs) kiểm thử đầy đủ validator, handler, token invalidation, redact secrets và không lộ email tồn tại)
  - `Identity.IntegrationTests`: bộ kiểm thử MySQL [`PasswordFlowsAndGetMeIntegrationTests`](../../backend/tests/Identity.IntegrationTests/Auth/PasswordFlowsAndGetMeIntegrationTests.cs) được bổ sung và biên dịch sạch.

## 3. Lưu ý cho downstream (`T-S1-BE-05`, `T-S1-BE-06`, `T-S1-FE-02`)

1. `T-S1-BE-05` (`Notification` email handler): lắng nghe `PasswordResetRequested(EventId, OccurredAt, UserId, TokenId, RawToken)` và dùng `RawToken` trong bộ nhớ để tạo link đặt lại mật khẩu gửi cho người dùng.
2. `T-S1-FE-02` (SCR-AUTH-06 đổi mật khẩu, quản lý phiên): các endpoint `POST /api/v1/auth/change-password` và `GET /api/v1/auth/me` đã sẵn sàng và khớp hoàn toàn `openapi/modules/identity.yaml`.
