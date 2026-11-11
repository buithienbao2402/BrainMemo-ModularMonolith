# Handoff Note – T-S0-BE-02

- **Task:** `T-S0-BE-02` – Host `BrainMemo.WebApi`: JWT bearer, ProblemDetails tiếng Việt (ánh xạ mã lỗi §3), RateLimiter (login 5/phút/IP), CORS, `/health`, Swagger, đăng ký module động
- **Vai trò:** BE
- **Nhánh:** `feat/T-S0-BE-02-webapi-host`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **Cổng đăng ký module ở `BrainMemo.BuildingBlocks.Abstractions`:**
   - Thêm [`Modules/IModule.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Modules/IModule.cs) (`Name`, `RegisterServices(IServiceCollection, IConfiguration)`).

2. **Host `BrainMemo.WebApi` (`backend/src/Host/BrainMemo.WebApi/`):**
   - `Program.cs` + `appsettings.json` + `appsettings.Development.json` (không commit secret thật; cấu hình JSON `camelCase` + `JsonStringEnumConverter`).
   - **JWT Bearer (`Security/JwtBearerExtensions.cs`):** đọc cấu hình `Jwt` (`Issuer`, `Audience`, `SigningKey`, `ClockSkew = TimeSpan.Zero`, `MapInboundClaims = false`); dùng `IOptions<JwtOptions>` để tương thích override cấu hình/test. Ở Development/Testing nếu chưa đặt `SigningKey` thì dùng khóa ephemeral trong tiến trình; ngoài Development/Testing yêu cầu `SigningKey` ≥ 32 ký tự. `OnChallenge` / `OnForbidden` trả ProblemDetails `401 UNAUTHENTICATED` / `403 FORBIDDEN`.
   - **ProblemDetails tiếng Việt (`Errors/`):**
     - `ErrorCodeMapper`: ánh xạ toàn bộ **35 mã lỗi** ở `contracts/README.md` §3 sang HTTP status + thông điệp tiếng Việt mặc định (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `503`, fallback `500 INTERNAL_SERVER_ERROR`).
     - `ProblemDetailsWriter` & `ResultActionResultExtensions`: xuất RFC 9457 (`application/problem+json`) đúng schema `Problem` ở `openapi/openapi.root.yaml` (`type`, `title`, `status`, `detail`, `code`, `traceId`, `errors[]` dạng `camelCase` cho `VALIDATION_FAILED` / `CHAPTER_PUBLISH_BLOCKED`, và các metadata như `lockedUntil` / `lockReason` cho `ACCOUNT_LOCKED`).
     - `GlobalExceptionHandler` + `InvalidModelStateResponseFactory` + `UseStatusCodePages`: xử lý JSON sai định dạng → `400 MALFORMED_REQUEST`, validation binding → `422 VALIDATION_FAILED`, route không tồn tại → `404 NOT_FOUND`, exception chưa bắt → `500 INTERNAL_SERVER_ERROR` không lộ stack trace.
   - **RateLimiter (`RateLimiting/RateLimitingExtensions.cs`):** policy `"login"` (`RateLimitPolicies.Login`) và `"auth-sensitive"` giới hạn **5 lượt/phút/IP** (`FixedWindowRateLimiter`), từ chối bằng `429 RATE_LIMITED` + header `Retry-After`.
   - **CORS (`Options/CorsOptions.cs`):** đọc `Cors:AllowedOrigins` (hỗ trợ danh sách phân tách dấu phẩy theo `.env.example`, bật `AllowCredentials()` phục vụ HttpOnly cookie `DEC-19`).
   - **`GET /health`:** trả `200 OK` JSON `{ status, service, utcNow, modules }`, `AllowAnonymous`, bỏ qua rate limit.
   - **Swagger (`Swagger/SwaggerExtensions.cs`):** bật ở Development hoặc `Swagger:Enabled=true`, cấu hình `bearerAuth`.
   - **Đăng ký module động (`Modules/ModuleRegistry.cs`):** tự động phát hiện các assembly `BrainMemo.<Module>.{Api,Application,Infrastructure}`, gắn `ApplicationPart`, đăng ký MediatR + FluentValidation cho các `*.Application`, và gọi tất cả `IModule` rồi lưu `ModuleCatalog`.

3. **Kiểm thử (`backend/tests/WebApi.Tests/`):**
   - `ErrorCodeMapperTests` (36 case phủ 35 mã lỗi §3 + fallback).
   - `ModuleRegistryTests` (test phát hiện & đăng ký `IModule`).
   - `WebApiHostIntegrationTests` (`WebApplicationFactory<Program>`): kiểm tra `GET /health`, 404 Problem, JWT 401/200/403, RateLimiter `login` (5 đạt + thứ 6 trả 429 `RATE_LIMITED`), model validation 422 `errors[]`, JSON hỏng 400 `MALFORMED_REQUEST`, `Result.Failure` `ACCOUNT_LOCKED` 403 kèm `lockedUntil`/`lockReason`, exception 500 không lộ nội dung nhạy cảm, CORS preflight và `/swagger/v1/swagger.json`.

## Kết quả kiểm tra

- `dotnet build backend\BrainMemo.sln --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1`: build sạch (**0 Warning(s), 0 Error(s)**).
- `dotnet test backend\BrainMemo.sln --no-build --logger "console;verbosity=normal"`:
  - `BuildingBlocks.UnitTests`: **32/32 passed**.
  - `WebApi.Tests`: **43/43 passed**.
  - Tổng: **75/75 passed**, 0 failed, 0 skipped.
- `dotnet format backend\BrainMemo.sln --verify-no-changes --no-restore`: đạt (exit 0).

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không sửa `frontend/`, `openapi/`, `contracts/`.
- Các endpoint của module (`T-S1-BE-01`+) dùng `[Route("api/v1/...")]`, chuyển `Result` sang HTTP bằng `result.ToActionResult(HttpContext)` và dùng `[EnableRateLimiting(RateLimitPolicies.Login)]` trên endpoint đăng nhập.
- Triển khai `IModule` tại `BrainMemo.<Module>.Infrastructure` (hoặc `.Api`) để `ModuleRegistry` tự nạp không cần sửa `Program.cs`.
