# Handoff Note — T-S1-BE-03 (Login / Refresh / Logout / LogoutAll / Sessions)

- **Task**: `T-S1-BE-03`
- **Role**: BE
- **Branch**: `feat/T-S1-BE-03-auth-sessions`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành cụm xác thực và quản lý phiên đăng nhập của module **Identity** theo đúng [`openapi/modules/identity.yaml`](../../openapi/modules/identity.yaml), `DEC-19`, và `THIET_KE_CSDL §3.1.6.3`:

1. **Application Layer** ([`BrainMemo.Identity.Application`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/BrainMemo.Identity.Application.csproj))
   - [`IJwtTokenGenerator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Abstractions/IJwtTokenGenerator.cs) & [`IdentityJwtOptions`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Options/IdentityJwtOptions.cs) (`SectionName = "Jwt"`, `AccessTokenMinutes = 30`, `RefreshTokenDays = 14`).
   - Mở rộng [`IIdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Abstractions/IIdentityAuthRepository.cs) với các phương thức quản lý `RefreshSession` (`FindUserByEmailAsync`, `IsUserAdminAsync`, `SaveUserAsync`, `FindSessionByTokenHashAsync`, `TryRotateSessionAsync`, `RevokeSessionByTokenHashAsync`, `RevokeAllUserSessionsAsync`, `GetActiveSessionsForUserAsync`, `FindSessionByIdAsync`, `RevokeSessionByIdAsync`).
   - `POST /api/v1/auth/login` -> [`LoginCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Login/LoginCommand.cs), [`LoginCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Login/LoginCommandValidator.cs), [`LoginCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Login/LoginCommandHandler.cs):
     - Chống dò email (timing attack) bằng verify với `DummyBcryptHash` khi email không tồn tại; trả `INVALID_CREDENTIALS` (`401 Unauthorized`).
     - Tự động mở khóa tạm thời đã hết hạn lúc đăng nhập (`user.UnlockIfExpired(utcNow)`) và đẩy sự kiện `AccountUnlocked(UnlockKind.AutoExpired)` vào `IPostCommitEventQueue`.
     - Nếu tài khoản đang bị khóa (`LOCKED_TEMPORARY` chưa hết hạn hoặc `LOCKED_PERMANENT`), thu hồi mọi phiên đang hoạt động (`SessionRevokeReason.AccountLocked`) và trả `ACCOUNT_LOCKED` (`403 Forbidden`) kèm `lockedUntil` và `lockReason` trong ProblemDetails extensions.
     - Phát hành `RefreshSession` 14 ngày (lưu hash SHA-256 32-byte vào `idn_refresh_session`) và JWT access token 30 phút (`1800` giây).
   - `POST /api/v1/auth/refresh` -> [`RefreshTokenCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Refresh/RefreshTokenCommand.cs), [`RefreshTokenCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Refresh/RefreshTokenCommandValidator.cs), [`RefreshTokenCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Refresh/RefreshTokenCommandHandler.cs):
     - Xoay vòng refresh token nguyên tử bằng `TryRotateSessionAsync` (`UPDATE idn_refresh_session SET token_hash = @newHash, last_used_at = @now, expires_at = @newExpires WHERE token_hash = @oldHash AND revoked_at IS NULL AND expires_at > @now`). Khi có 2 yêu cầu refresh đồng thời cùng mang 1 cookie, chỉ đúng 1 yêu cầu thắng (`affected == 1`), yêu cầu còn lại nhận `UNAUTHENTICATED` (`401 Unauthorized`).
     - Kiểm tra trạng thái tài khoản (`account_status`) và tự động gỡ khóa tạm thời hết hạn nếu có; tài khoản khóa bị thu hồi phiên và nhận `403 ACCOUNT_LOCKED`.
   - `POST /api/v1/auth/logout` -> [`LogoutCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Logout/LogoutCommand.cs), [`LogoutCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Logout/LogoutCommandHandler.cs):
     - Idempotent (`204 No Content`), thu hồi phiên theo `token_hash` với lý do `LOGOUT` và xóa cookie.
   - `POST /api/v1/auth/logout-all` -> [`LogoutCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/LogoutAll/LogoutAllCommand.cs), [`LogoutAllCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/LogoutAll/LogoutAllCommandHandler.cs):
     - Thu hồi toàn bộ phiên đang hoạt động của người dùng hiện tại với lý do `LOGOUT_ALL` và xóa cookie (`204 No Content`).
   - `GET /api/v1/auth/sessions` & `DELETE /api/v1/auth/sessions/{id}` -> [`ListSessionsQuery`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Queries/ListSessions/ListSessionsQuery.cs), [`RevokeSessionCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/RevokeSession/RevokeSessionCommand.cs):
     - Liệt kê các phiên hoạt động (`revoked_at IS NULL AND expires_at > now`) sắp xếp giảm dần theo `last_used_at`, đánh dấu `isCurrent = true` khi khớp `token_hash` của cookie hiện tại.
     - Thu hồi phiên theo `id` (chỉ của chính chủ, nếu không thuộc user hiện tại trả `404 NOT_FOUND`) với lý do `USER_REVOKED`; nếu thu hồi chính phiên hiện tại thì xóa luôn cookie refresh.

2. **Infrastructure Layer** ([`JwtTokenGenerator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Security/JwtTokenGenerator.cs), [`IdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Persistence/IdentityAuthRepository.cs))
   - `JwtTokenGenerator`: ký HMAC-SHA256 JWT với claims `sub`, `email`, `email_verified`, `account_status`, `role` (`ADMIN` / `USER`), `jti`.
   - `IdentityAuthRepository`: triển khai đầy đủ cho cả MySQL 8 (cập nhật nguyên tử có điều kiện theo `BINARY(32)` `token_hash` và `BINARY(16)` `id`/`user_id` big-endian) lẫn EF Core InMemory.

3. **API & Host Layer** ([`AuthController`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/AuthController.cs), [`AccountStatusMiddleware`](../../backend/src/Host/BrainMemo.WebApi/Security/AccountStatusMiddleware.cs))
   - Cookie refresh: tên `refreshToken` (hỗ trợ đọc fallback `bm_refresh_token`), `HttpOnly = true`, `Secure = true` (hoặc HTTPS trong Dev), `SameSite = Strict`, `Path = /api/v1/auth` (`DEC-19`).
   - `POST /api/v1/auth/login` gắn `[EnableRateLimiting("login")]` (5 yêu cầu/phút/IP).
   - `AccountStatusMiddleware` đặt giữa `UseAuthentication()` và `UseAuthorization()` trong [`Program.cs`](../../backend/src/Host/BrainMemo.WebApi/Program.cs), kiểm tra trạng thái tài khoản trên mọi API xác thực và chặn tài khoản bị khóa với `403 ACCOUNT_LOCKED` (kèm `lockedUntil`, `lockReason`).

## 2. Kiểm thử & Chất lượng đã chạy

- `dotnet format backend/BrainMemo.sln --no-restore --include backend/src/Host/BrainMemo.WebApi backend/src/Modules/Identity backend/tests/Identity.UnitTests backend/tests/Identity.IntegrationTests backend/tests/WebApi.Tests/Host/WebApiHostIntegrationTests.cs` -> **Exit 0**
- `dotnet build backend/BrainMemo.sln -c Release --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1` -> **Build succeeded. 0 Warning(s), 0 Error(s)**
- Sequential `dotnet test` (`-c Release --no-build`):
  - `Architecture.Tests`: **13/13 passed** (`0` failed, `0` skipped)
  - `BuildingBlocks.UnitTests`: **69/69 passed** (`0` failed, `0` skipped)
  - `WebApi.Tests` (`--filter "FullyQualifiedName!~MinioIntegrationTests"`): **59/59 passed** (`0` failed, `0` skipped; bao gồm kiểm thử `AccountStatusMiddleware` chặn JWT khóa với `403 ACCOUNT_LOCKED`)
  - `Identity.UnitTests`: **48/48 passed** (`0` failed, `0` skipped; bao gồm bộ test mới [`LoginRefreshLogoutSessionTests`](../../backend/tests/Identity.UnitTests/Auth/LoginRefreshLogoutSessionTests.cs) cho `Login`, `Refresh` xoay vòng & đua đồng thời, `Logout`, `LogoutAll`, `ListSessions`, `RevokeSession`, tự động gỡ khóa tạm thời hết hạn, redacted `ToString()`, và EF Core InMemory repository)
  - Bộ kiểm thử tích hợp MySQL [`LoginRefreshLogoutSessionIntegrationTests`](../../backend/tests/Identity.IntegrationTests/Auth/LoginRefreshLogoutSessionIntegrationTests.cs) đã được viết đầy đủ và biên dịch sạch (cần Docker daemon bật khi chạy container MySQL 8).

## 3. Lưu ý cho downstream (`T-S1-BE-04`, `T-S1-FE-01`, `T-S1-FE-02`, `T-S1-INT-01`)

1. Cookie refresh được đặt tại `Path=/api/v1/auth` với tên `refreshToken` (và đọc tương thích cả `bm_refresh_token` nếu FE gửi). FE HTTP client chỉ cần bật `credentials: 'include'` khi gọi `/api/v1/auth/*`.
2. `T-S1-BE-04` (`ForgotPassword` / `ResetPassword` / `ChangePassword` / `GET /auth/me`) có thể tái sử dụng trực tiếp `IIdentityAuthRepository.RevokeAllUserSessionsAsync` khi đặt lại hoặc đổi mật khẩu.
