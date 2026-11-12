# Handoff Note — T-S1-BE-02 (Register & VerifyEmail)

- **Task**: `T-S1-BE-02`
- **Role**: BE
- **Branch**: `feat/T-S1-BE-02-register-verify-email`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành hai endpoint đăng ký và xác minh email cho module **Identity** theo đúng [`openapi/modules/identity.yaml`](../../openapi/modules/identity.yaml) và `DEC-26` (không thêm resend-verification, chưa mở `T-S1-BE-03`/`T-S1-BE-04`):

1. **Application Layer** ([`BrainMemo.Identity.Application`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/BrainMemo.Identity.Application.csproj))
   - [`IdentityOptions`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Options/IdentityOptions.cs) (`SectionName = "Identity"`, mặc định `EmailVerificationTokenTtl = 24h`, `PasswordResetTokenTtl = 1h`).
   - [`IIdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Abstractions/IIdentityAuthRepository.cs) & [`IPostCommitEventQueue`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Abstractions/IPostCommitEventQueue.cs).
   - `POST /api/v1/auth/register` -> [`RegisterCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Register/RegisterCommand.cs), [`RegisterCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Register/RegisterCommandValidator.cs), [`RegisterCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/Register/RegisterCommandHandler.cs):
     - Chuẩn hóa email via `EmailAddress.Create`, kiểm tra mật khẩu (min 8, max 128, không toàn khoảng trắng), `ToString()` redacted không lộ email/mật khẩu.
     - Tạo `User` chưa xác minh (`EmailVerifiedAt == null`), hash mật khẩu qua `IPasswordHasher` (BCrypt), phát hành token `UserTokenPurpose.VerifyEmail` với hash SHA-256 32-byte qua `ITokenCryptoService` và `ExpiresAt = utcNow + IdentityOptions.EmailVerificationTokenTtl`.
     - Lưu nguyên tử qua `AddUserAndSaveAsync` (bắt duplicate race `uk_idn_user_email` -> `EMAIL_TAKEN` `409 Conflict`).
     - Hàng đợi `UserRegistered` và `EmailVerificationRequested(RawToken)` vào `IPostCommitEventQueue` chỉ sau khi lưu thành công (`RawToken` chỉ giữ trong bộ nhớ, không ghi DB/Outbox/log theo `NFR-04`).
   - `POST /api/v1/auth/verify-email` -> [`VerifyEmailCommand`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/VerifyEmail/VerifyEmailCommand.cs), [`VerifyEmailCommandValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/VerifyEmail/VerifyEmailCommandValidator.cs), [`VerifyEmailCommandHandler`](../../backend/src/Modules/Identity/BrainMemo.Identity.Application/Auth/Commands/VerifyEmail/VerifyEmailCommandHandler.cs):
     - Trim & validate độ dài token (max 512), hash SHA-256 và tiêu thụ nguyên tử bằng `TryConsumeUserTokenAsync`.
     - Token thiếu / sai / đã tiêu thụ / hết hạn trả về `TOKEN_INVALID_OR_EXPIRED` (`400 Bad Request`).

2. **Infrastructure Layer** ([`BrainMemo.Identity.Infrastructure`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/IdentityModule.cs))
   - [`IdentityOptionsValidator`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Options/IdentityOptionsValidator.cs): kiểm tra TTL dương lúc resolve `IOptions<IdentityOptions>`.
   - [`IdentityPostCommitEventQueue`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Persistence/IdentityPostCommitEventQueue.cs) & [`IdentityUnitOfWork`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Persistence/IdentityUnitOfWork.cs): xóa queue khi begin/rollback/dispose; flush & publish `IEventBus` **nghiêm ngặt sau `inner.CommitAsync()`**; guard `_committed` ở `RollbackAsync`.
   - [`IdentityAuthRepository`](../../backend/src/Modules/Identity/BrainMemo.Identity.Infrastructure/Persistence/IdentityAuthRepository.cs): bắt `MySqlException(1062)` cho `uk_idn_user_email` -> `EMAIL_TAKEN`; thực thi `UPDATE idn_user_token SET consumed_at = @utcNow WHERE token_hash = @tokenHash AND purpose = 'VERIFY_EMAIL' AND consumed_at IS NULL AND expires_at > @utcNow` bảo đảm single-use dưới tải đồng thời.

3. **API & Host Wiring** ([`AuthController`](../../backend/src/Modules/Identity/BrainMemo.Identity.Api/Auth/AuthController.cs), [`ErrorResultFilter`](../../backend/src/Host/BrainMemo.WebApi/Errors/ErrorResultFilter.cs))
   - `AuthController` (`[Route("api/v1/auth")]`, `[AllowAnonymous]`): `POST register` (`201 Created`) và `POST verify-email` (`204 No Content`), không phá quy tắc kiến trúc tham chiếu `BrainMemo.WebApi`.
   - `ErrorResultFilter` (`IAlwaysRunResultFilter`) đăng ký trong [`Program.cs`](../../backend/src/Host/BrainMemo.WebApi/Program.cs) chuyển `ObjectResult(Error / failed Result)` sang RFC 9457 ProblemDetails thông qua `ResultActionResultExtensions.ToActionResult`.
   - [`appsettings.json`](../../backend/src/Host/BrainMemo.WebApi/appsettings.json) bổ sung section `Identity` (`EmailVerificationTokenTtl`: `24:00:00`, `PasswordResetTokenTtl`: `01:00:00`).

## 2. Kiểm thử & Chất lượng đã chạy (sau chỉnh sửa cuối cùng)

- `dotnet format backend/BrainMemo.sln --verify-no-changes --no-restore --include backend/src/Host/BrainMemo.WebApi/Program.cs backend/src/Host/BrainMemo.WebApi/Errors/ErrorResultFilter.cs backend/src/Modules/Identity backend/tests/Identity.UnitTests backend/tests/Identity.IntegrationTests backend/tests/WebApi.Tests/Errors/ErrorResultFilterTests.cs` -> **Exit 0**
- `dotnet build backend/BrainMemo.sln -c Release --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1` -> **Build succeeded. 0 Warning(s), 0 Error(s)**
- Sequential `dotnet test` (`-c Release --no-build`):
  - `Architecture.Tests`: **13/13 passed** (`0` failed, `0` skipped)
  - `BuildingBlocks.UnitTests`: **69/69 passed** (`0` failed, `0` skipped)
  - `WebApi.Tests` (`--filter "FullyQualifiedName!~MinioIntegrationTests"`): **59/59 passed** (`0` failed, `0` skipped; bao gồm 3 unit test mới cho `ErrorResultFilter`; loại trừ `MinioIntegrationTests` vì MinIO không chạy trong phiên này)
  - `Identity.UnitTests`: **40/40 passed** (`0` failed, `0` skipped; bao gồm unit tests mới cho `RegisterCommand*`, `VerifyEmailCommand*`, `IdentityOptionsValidator`, redacted `ToString()`, và DI/MediatR pipeline)
  - `Identity.IntegrationTests`: **9/9 passed** (`0` failed, `0` skipped, chạy trên MySQL 8.0 thật; bao gồm 4 HTTP + MySQL integration tests mới chứng minh register, duplicate 409, concurrent duplicate 409, verify 204, expired token 400, single-use replay 400, concurrent verify 1x204/1x400, validation 422, malformed 400, và post-commit visibility trong `IEventBus`)
- `docker ps -a`: không còn container test tồn đọng.

## 3. Lưu ý cho downstream (`T-S1-BE-03`, `T-S1-BE-04`, `T-S1-BE-06`)

1. `ErrorResultFilter` và `IPostCommitEventQueue` / `IdentityUnitOfWork` đã sẵn sàng cho các endpoint còn lại của module Identity (`login`, `refresh`, `forgot-password`, `reset-password`) cũng như các module khác trả `ObjectResult(Result.Error)` từ `.Api` assembly.
2. `T-S1-BE-06` (`Notification` email template & listener) cần lắng nghe `EmailVerificationRequested` và sử dụng `RawToken` trực tiếp trong bộ nhớ để dựng link xác minh email (không lưu `RawToken` xuống DB/Outbox/Log).
