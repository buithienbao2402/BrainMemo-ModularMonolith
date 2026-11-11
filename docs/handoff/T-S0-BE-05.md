# Handoff Note – T-S0-BE-05

- **Task:** `T-S0-BE-05` – File storage service (`S3FileStorage` cho R2/MinIO) + Presigned upload URL endpoint
- **Vai trò:** BE
- **Nhánh:** `feat/T-S0-BE-05-s3-file-storage`
- **Trạng thái:** DONE

## Đã thực hiện

1. **Chính sách & kiểu tải tệp dùng chung (`BrainMemo.BuildingBlocks.Abstractions`):**
   - [`FileUploadPurpose.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Storage/FileUploadPurpose.cs): enum 5 mục đích (`AVATAR`, `COURSE_COVER`, `COURSE_RESOURCE`, `ASSIGNMENT_FILE`, `REPORT_EVIDENCE`) chuẩn hóa JSON qua `[JsonStringEnumMemberName]` khớp [`openapi/modules/files.yaml`](../../openapi/modules/files.yaml).
   - [`FileUploadPolicy.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Abstractions/Storage/FileUploadPolicy.cs): quy tắc giới hạn kích thước & whitelist mở rộng/MIME theo `DEC-05` và `THIET_KE_CSDL.md §4` (bỏ magic-byte sniffing): ảnh tối đa **5 MB** (`5_242_880` bytes: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`), tệp tài nguyên/bài nộp tối đa **20 MB** (`20_971_520` bytes: `.pdf`, `.txt`, `.md`, `.csv`, Office, `.zip`, `.mp4`, `.webm`, `.mov`, `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`), loại bỏ đuôi thực thi/SVG/không khớp MIME với lỗi `FILE_TYPE_NOT_ALLOWED` / `FILE_TOO_LARGE` / `VALIDATION_FAILED`. Cung cấp `BuildTempObjectKey(...)` (`tmp/{userId}/{objectId}.{ext}`) và `ValidateCommittedObject(...)` cho các module `T-S2+` dùng lại khi `Commit`.

2. **Triển khai S3 Storage (`BrainMemo.BuildingBlocks.Infrastructure`):**
   - [`BrainMemo.BuildingBlocks.Infrastructure.csproj`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/BrainMemo.BuildingBlocks.Infrastructure.csproj): thêm `AWSSDK.S3` (`4.0.104.12`).
   - [`S3Options.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Storage/S3Options.cs): options section `S3` khớp `S3__*` trong [`infra/env/.env.example`](../../infra/env/.env.example) (`Endpoint`, `AccessKey`, `SecretKey`, `Bucket`, `Region`, `ForcePathStyle`, `UploadUrlTtlMinutes`, `DownloadUrlTtlMinutes`).
   - [`S3FileStorage.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Storage/S3FileStorage.cs): cài đủ `IFileStorage` (`CreateUploadUrl`, `Head`, `Commit`, `CreateDownloadUrl`, `Delete`, `DeleteByPrefix`). Cấu hình `RequestChecksumCalculation = WHEN_REQUIRED` và `ResponseChecksumValidation = WHEN_REQUIRED`, cùng `Protocol` tự động `HTTP`/`HTTPS` theo `S3:Endpoint` để URL Presigned `PUT` tương thích cả MinIO (`http://localhost:9000`) và Cloudflare R2 (`auto`) khi XHR tải lên trực tiếp chỉ với header `Content-Type`. `Commit` copy `tmp/` sang final key và xóa `tmpKey` theo cơ chế best-effort (lifecycle 24h xử lý phần còn lại).
   - [`StorageServiceCollectionExtensions.cs`](../../backend/src/BuildingBlocks/BrainMemo.BuildingBlocks.Infrastructure/Storage/StorageServiceCollectionExtensions.cs): helper `AddS3FileStorage(...)`.

3. **Endpoint & Cấu hình Host (`BrainMemo.WebApi`):**
   - [`FilesController.cs`](../../backend/src/Host/BrainMemo.WebApi/Controllers/FilesController.cs): `POST /api/v1/files/upload-urls` (`[Authorize]`), kiểm tra `sub` claim, validate `CreateUploadUrlRequest` qua `FileUploadPolicy`, sinh `tmpKey` bằng `UuidV7.NewGuid(clock.UtcNow)`, trả `UploadUrlDto` (`uploadKey`, `uploadUrl`, `method: "PUT"`, `headers`, `expiresAt`) hoặc RFC 9457 ProblemDetails (`UNAUTHENTICATED`, `VALIDATION_FAILED`, `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED`).
   - [`Program.cs`](../../backend/src/Host/BrainMemo.WebApi/Program.cs) & [`appsettings.json`](../../backend/src/Host/BrainMemo.WebApi/appsettings.json): đăng ký `AddS3FileStorage(builder.Configuration)` và section `S3` mặc định (không chứa secret).

4. **Kiểm thử:**
   - [`FileUploadPolicyTests.cs`](../../backend/tests/BuildingBlocks.UnitTests/Storage/FileUploadPolicyTests.cs): kiểm tra giới hạn 5 MB / 20 MB, whitelist extension + MIME, key `tmp/`, và `ValidateCommittedObject`.
   - [`FilesEndpointTests.cs`](../../backend/tests/WebApi.Tests/Storage/FilesEndpointTests.cs): kiểm tra `401 UNAUTHENTICATED`, `200 UploadUrlDto`, `422 FILE_TOO_LARGE`, `422 FILE_TYPE_NOT_ALLOWED`, `422 VALIDATION_FAILED` (`application/problem+json`).
   - [`S3FileStorageMinioIntegrationTests.cs`](../../backend/tests/WebApi.Tests/Storage/S3FileStorageMinioIntegrationTests.cs): integration test thật với MinIO (`pgsty/silo` qua `infra/docker-compose.dev.yml`) cho trọn vòng đời `CreateUploadUrl` -> HTTP `PUT` trực tiếp -> `Head` -> `Commit` -> `CreateDownloadUrl` -> HTTP `GET` -> `Delete` -> `DeleteByPrefix`, và luồng `POST /api/v1/files/upload-urls` -> HTTP `PUT` vào MinIO -> `Head`.

## Kết quả kiểm tra

- `dotnet build backend\BrainMemo.sln --no-restore --disable-build-servers -p:UseSharedCompilation=false -m:1`: build sạch (**0 Warning(s), 0 Error(s)**).
- `dotnet test backend\BrainMemo.sln --no-build --logger "console;verbosity=normal"` (cùng MinIO `pgsty/silo:latest` + `pgsty/mc:latest` chạy qua `infra/docker-compose.dev.yml`, `BypassSandbox: true`):
  - `BuildingBlocks.UnitTests`: **69/69 passed**.
  - `WebApi.Tests`: **58/58 passed** (gồm integration test MinIO).
  - `Architecture.Tests`: **13/13 passed**.
  - Tổng: **140/140 passed**, 0 failed, 0 skipped.
- `dotnet format backend\BrainMemo.sln --verify-no-changes --no-restore` (`BypassSandbox: true`): đạt (exit `0`).

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không sửa `frontend/`, `openapi/`, `contracts/`.
- Đáp ứng đúng `openapi/modules/files.yaml`, `DEC-05`, `DEC-06`, `DEC-18` và `contracts/README.md §2–§3`.
- Khi cần xác nhận tệp đã upload trong các endpoint nghiệp vụ ở `T-S2+` (`Profile`, `Course`, `Content`, `Learning`, `Moderation`), gọi `IFileStorage.Head(uploadKey)` + `FileUploadPolicy.ValidateCommittedObject(purpose, currentUserId, uploadKey, head)` trước khi `IFileStorage.Commit(uploadKey, finalKey)`.
- Chạy `docker compose -f infra/docker-compose.dev.yml up -d minio minio-init` trước khi chạy `S3FileStorageMinioIntegrationTests` ở môi trường local/CI.
