# Handoff Note — T-S1-BE-01 (Identity Domain, DbContext & Migration, `IIdentityContract`)

- **Task**: `T-S1-BE-01`
- **Role**: BE
- **Branch**: `feat/T-S1-BE-01-identity-domain`
- **Status**: `REVIEW`

## 1. Phạm vi đã triển khai

Hoàn thành nền tảng module **Identity** (không bao gồm HTTP endpoints hay auth use-cases thuộc `T-S1-BE-02`/`03`/`04`):

1. **Solution & Project Wiring** ([`backend/BrainMemo.sln`](../../backend/BrainMemo.sln), [`BrainMemo.WebApi.csproj`](../../backend/src/Host/BrainMemo.WebApi/BrainMemo.WebApi.csproj))
   - Scaffold và đăng ký 5 project của module Identity theo `docs/REPO_STRUCTURE.md` §2:
     - `BrainMemo.Identity.Contracts` (chỉ reference `BrainMemo.SharedKernel`)
     - `BrainMemo.Identity.Domain` (chỉ reference `BrainMemo.SharedKernel`)
     - `BrainMemo.Identity.Application`
     - `BrainMemo.Identity.Infrastructure` (`Pomelo.EntityFrameworkCore.MySql` 9.0.0, `Microsoft.EntityFrameworkCore.Design` 9.0.2, `BCrypt.Net-Next` 4.2.0)
     - `BrainMemo.Identity.Api` (`IdentityApiModule` marker class — chưa mở endpoint)
   - Tạo 2 test project: `Identity.UnitTests` và `Identity.IntegrationTests`.

2. **Public Contracts & Integration Events** (`BrainMemo.Identity.Contracts`, bám sát [`contracts/identity.md`](../../contracts/identity.md) & [`contracts/events.md`](../../contracts/events.md), Contract Version 1)
   - `IIdentityContract`: `GetAccountStatus`, `IsAdmin`, `IsLastAdmin`, `GetUserSummary`, `ListActiveUserIds`, `FindUserIdByEmail`, `LockAccount`, `UnlockAccount`.
   - Constants / Enums / DTOs: `AccountStatuses`, `LockType`, `AccountStatusDto`, `UserSummaryDto`, `UnlockKind`.
   - Integration Events: `UserRegistered`, `EmailVerificationRequested`, `PasswordResetRequested`, `AccountLocked`, `AccountUnlocked`.

3. **Identity Domain Model** (`BrainMemo.Identity.Domain`)
   - Aggregates & Entities (khớp bảng `idn_*` trong [`db/schema.sql`](../../db/schema.sql)):
     - `User` (`AggregateRoot` quản lý `ExternalIdentities`, `RefreshSessions`, `Tokens`): enforce invariant khóa tạm/vĩnh viễn, idempotency theo `sanctionId`, lazy-expiry cleanup trước khi kiểm tra `AlreadyLocked`, thu hồi refresh session khi khóa, `UnlockManual`, `UnlockIfExpired`.
     - `AdminGrant` (`AggregateRoot` tách rời `User` theo `THIET_KE_CSDL.md` §3.1.5).
     - `ExternalIdentity`, `RefreshSession`, `UserToken`.
   - Value Objects: `EmailAddress` (trimmed lowercase, max 255), `TokenHash` (chính xác 32 bytes).
   - Enums: `AccountStatus`, `ExternalProvider`, `SessionRevokeReason`, `UserTokenPurpose`.
   - Domain Events: `UserRegisteredDomainEvent`, `AccountLockedDomainEvent`, `AccountUnlockedDomainEvent`.

4. **Application & Infrastructure & Persistence** (`BrainMemo.Identity.Application`, `BrainMemo.Identity.Infrastructure`)
   - Application abstractions: `IPasswordHasher`, `ITokenCryptoService`.
   - `IdentityModule` (`IModule`) đăng ký `IdentityDbContext` với static `IdentityDbContext.DefaultMySqlServerVersion` (`8.0.36`, giúp Host DI khởi động không cần kết nối MySQL lúc startup), `IdentityUnitOfWork`, `IIdentityContract` (`IdentityContractService`), `IPasswordHasher` (`BCryptPasswordHasher` với work factor 11), `ITokenCryptoService` (`Sha256TokenCryptoService` với `Base64Url` + `SHA256`).
   - `BigEndianGuidBytesConverter` (`guid.ToByteArray(true)` <-> `new Guid(bytes, true)`) đồng bộ byte order với MySQL `UUID_TO_BIN(uuid)` (`swap_flag = 0`) cùng UTC `DateTimeOffset` converters cho `DATETIME(3)`.
   - EF Core Entity Configurations cho 5 bảng `idn_user` (`ck_idn_user_lock`), `idn_external_identity`, `idn_refresh_session` (`ck_idn_session_revoke`), `idn_user_token`, `idn_admin_grant` (`ck_idn_admin_grant_revoke` + shadow generated column `active_marker` và unique index `uk_idn_admin_grant_active`).
   - Initial EF Core migration: `20261111203631_InitialIdentity` (đã đối chiếu DDL và verify chạy `MigrateAsync()` trên MySQL 8.0 thật).
   - `IdentityContractService`: triển khai đầy đủ 8 operation của `IIdentityContract`, gồm atomic conditional lazy auto-unlock SQL, cursor pagination theo byte order `BINARY(16)`, khóa `FOR UPDATE` sắp xếp theo `id` trên `active_marker = 1` + active admin `idn_user`, retry 1 lần khi gặp MySQL deadlock `1213`, và enlist vào `IAmbientTransactionAccessor` (`IModerationTransaction`, `DEC-04`).

5. **Architecture Test Harness Fix** ([`ArchitectureViolationTests.cs`](../../backend/tests/Architecture.Tests/ArchitectureViolationTests.cs))
   - Cập nhật `BuildMetadataReferences` (key theo simple assembly name và loại các DLL module thật trong `TRUSTED_PLATFORM_ASSEMBLIES`) và chèn synthetic compilation output vào đầu `_searchDirectories` để tránh xung đột `CS1704` khi `BrainMemo.WebApi` đã reference module Identity thật.

## 2. Kiểm thử & Chất lượng đã chạy (sau chỉnh sửa cuối cùng)

- `dotnet format backend/BrainMemo.sln --verify-no-changes --no-restore --include backend/src/Modules/Identity backend/tests/Identity.UnitTests backend/tests/Identity.IntegrationTests backend/tests/Architecture.Tests/ArchitectureViolationTests.cs` -> **Exit 0**
- `dotnet build backend/BrainMemo.sln -c Release --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1` -> **Build succeeded. 0 Warning(s), 0 Error(s)**
- Sequential `dotnet test` (`-c Release --no-build`):
  - `Architecture.Tests`: **13/13 passed** (0 failed, 0 skipped)
  - `BuildingBlocks.UnitTests`: **69/69 passed** (0 failed, 0 skipped)
  - `WebApi.Tests` (`--filter "FullyQualifiedName!~MinioIntegrationTests"`): **56/56 passed** (0 failed, 0 skipped; loại trừ `MinioIntegrationTests` vì MinIO không chạy trong phiên này)
  - `Identity.UnitTests`: **21/21 passed** (0 failed, 0 skipped) — Domain invariants (`User`, `AdminGrant`), security services (`BCryptPasswordHasher`, `Sha256TokenCryptoService`), `IdentityContractService` validation/guards, `IdentityModule` DI registration.
  - `Identity.IntegrationTests`: **5/5 passed** (0 failed, 0 skipped, chạy trên MySQL 8.0 thật) — EF `MigrateAsync()`, kiểm tra thực tế `ck_idn_user_lock` & `uk_idn_admin_grant_active`, đọc đối chiếu seed admin trong `db/schema.sql` + `db/seed/01_seed_admin.sql`, cursor pagination qua ranh giới dấu `BINARY(16)`, lazy auto-unlock + manual unlock, ambient `IModerationTransaction` commit/rollback, và `Task.WhenAll` race giữa 2 admin chứng minh 1 thành công / 1 trả về `LAST_ADMIN`.

## 3. Lưu ý cho downstream / INT / OPS

1. **MySQL 8.0 cho `Identity.IntegrationTests` & Jenkins CI**:
   - `MySqlTestDatabaseFixture` dùng biến môi trường `BRAINMEMO_TEST_MYSQL_CONNECTION` nếu được cấu hình; nếu không có, fixture tự động gọi Docker CLI khởi tạo container tạm `mysql:8.0` và xóa sạch khi dispose.
   - Hiện tại [`infra/jenkins/Jenkinsfile`](../../infra/jenkins/Jenkinsfile) trong stage test chưa Docker mới chỉ filter `FullyQualifiedName!~MinioIntegrationTests`. Ở môi trường CI không có MySQL service hoặc không cho test chạy Docker-in-Docker, OPS/INT cần bổ sung `BRAINMEMO_TEST_MYSQL_CONNECTION` (tới MySQL test service) hoặc cập nhật filter trong `Jenkinsfile` ở PR OPS riêng (không đụng `infra/` trong `T-S1-BE-01`).
2. **Ambient Transaction & In-Process Event Timing (`IModerationTransaction`)**:
   - `IModerationTxContext` hiện chưa có post-commit callback. Khi `IdentityContractService.LockAccount` enlist vào `IModerationTransaction` đang hoạt động, `AccountLocked` integration event được publish ngay sau `SaveChangesAsync()` (trong transaction của caller); khi chạy standalone transaction nội bộ của Identity, event được publish sau `CommitAsync()`. Các consumer Moderation/Audit cần lưu ý hành vi này hoặc mở rộng post-commit hook/outbox ở `BuildingBlocks` khi triển khai `T-S2-*`.
3. **Điểm nối tiếp cho `T-S1-BE-02/03/04`**:
   - Password hash từ [`01_seed_admin.sql`](../../db/seed/01_seed_admin.sql) (`01a1cb77-0375-7fb7-8b76-ecaf4cc36db6`) đã được kiểm tra tương thích với `IdentityDbContext` và `BCryptPasswordHasher`.
   - `BrainMemo.Identity.Api` hiện chỉ chứa marker `IdentityApiModule`; các endpoints (`register`, `login`, `refresh`, `verify-email`, `me`, `admin/users`, ...) sẽ gắn vào module này ở các task tiếp theo.

