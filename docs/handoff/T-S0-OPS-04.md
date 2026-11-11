# Handoff Note – T-S0-OPS-04

- **Task:** `T-S0-OPS-04` – `Jenkinsfile` + Dockerfiles (`backend`, `frontend`, `ai-service`) + `infra/nginx/nginx.conf` + `infra/docker-compose.yml`
- **Vai trò:** OPS
- **Nhánh:** `feat/T-S0-OPS-04-ci-dockerfiles-nginx`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **Dockerfiles & `.dockerignore` cho BE / FE / AI Service:**
   - [`.dockerignore`](../../.dockerignore), [`backend/.dockerignore`](../../backend/.dockerignore), [`ai-service/.dockerignore`](../../ai-service/.dockerignore): loại `.git`, `node_modules`, `bin/`, `obj/`, `dist/`, `.env*`, cache Python để build context gọn.
   - [`backend/Dockerfile`](../../backend/Dockerfile): multi-stage `mcr.microsoft.com/dotnet/sdk:9.0` -> `mcr.microsoft.com/dotnet/aspnet:9.0` (`ASPNETCORE_HTTP_PORTS=8080`, `ASPNETCORE_ENVIRONMENT=Production`), publish `--configuration Release /p:UseAppHost=false`, cài `curl` tối giản rồi chuyển về non-root `USER $APP_UID`, `HEALTHCHECK` vào `GET http://127.0.0.1:8080/health`.
   - [`frontend/Dockerfile`](../../frontend/Dockerfile) & [`frontend/nginx.conf`](../../frontend/nginx.conf): build workspace pnpm bằng context gốc repo (`.`) trên `node:22-alpine` (`corepack pnpm install --frozen-lockfile --filter frontend...`, `VITE_API_BASE_URL=/api/v1`, `VITE_USE_MOCK=false`, `corepack pnpm --filter frontend build`), runtime `nginx:1.27-alpine` phục vụ SPA với `try_files $uri $uri/ /index.html;`, cache 1 năm cho `/assets/`, `no-cache` cho `/index.html`, và `/healthz`.
   - [`ai-service/Dockerfile`](../../ai-service/Dockerfile): chạy non-root `appuser`, bổ sung `HEALTHCHECK` dùng `python -c "import urllib.request; ..."` kiểm tra `GET /health` trên cổng `8000`.

2. **Nginx Reverse Proxy & Docker Compose full-stack:**
   - [`infra/nginx/nginx.conf`](../../infra/nginx/nginx.conf): cấu hình `/etc/nginx/nginx.conf` hoàn chỉnh (`nginx:1.27-alpine`), `client_max_body_size 25m;` (khớp DEC-05 tệp tối đa 20 MB + headroom), `gzip on`, security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), Docker embedded DNS `resolver 127.0.0.11` để `nginx -t` chạy độc lập không cần container upstream sống sẵn. Định tuyến `/nginx-health` (liveness riêng của Nginx), `/health` và `/api/` -> `http://webapi:8080`, `/` -> `http://frontend:80`, giữ sẵn ghi chú khối TLS Origin CA cho `T-S12-OPS-01`.
   - [`infra/docker-compose.yml`](../../infra/docker-compose.yml): stack đầy đủ `mysql`, `minio`, `minio-init`, `mailpit`, `ai-service`, `webapi`, `frontend`, `nginx` trên bridge network `brainmemo_net`; bắt buộc inject các secret nhạy cảm qua `.env` / biến môi trường (`MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `Jwt__SigningKey`, `S3__AccessKey`, `S3__SecretKey`), đồng thời tự ánh xạ hostname nội bộ container cho `webapi` (`mysql:3306`, `http://minio:9000`, `mailpit`, `http://ai-service:8000`) và bind các cổng dev/admin về `${BIND_HOST:-127.0.0.1}`.
   - Xóa các file placeholder `infra/nginx/.gitkeep` và `infra/jenkins/.gitkeep`.

3. **CI Pipeline (`infra/jenkins/Jenkinsfile`):**
   - [`infra/jenkins/Jenkinsfile`](../../infra/jenkins/Jenkinsfile): Declarative Pipeline chạy xanh trên repo trống gồm các stage:
     1. `Preflight`: kiểm tra `node`, `corepack pnpm`, `dotnet`, và phát hiện Docker CLI/daemon (`REQUIRE_DOCKER` mặc định `false`).
     2. `Workspace Install (pnpm)`: `corepack pnpm install --frozen-lockfile` (không dùng `corepack enable` ở shell agent không có quyền root).
     3. `OpenAPI Bundle & Lint`: `tools test`, `openapi:check`, `openapi:lint`.
     4. `Frontend Quality & Build`: `lint`, `typecheck`, `test`, `build`.
     5. `Backend Build & Unit/Architecture Tests`: `dotnet restore`, `dotnet build -c Release --no-restore`, `dotnet test` với bộ lọc `FullyQualifiedName!~MinioIntegrationTests`.
     6. `Backend MinIO Integration Tests`: bật tạm `minio` + `minio-init` từ `infra/docker-compose.dev.yml`, chạy `S3FileStorageMinioIntegrationTests`, luôn dọn dẹp ở `post { always }`.
     7. `AI Service Verification`: `python -m compileall -q ai-service/app` và tự chạy `pytest` khi thư mục `ai-service/tests` có test case (`S11`).
     8. `Infra Config & Docker Image Builds`: kiểm tra `docker compose config --quiet` (cả dev và full-stack với `--env-file infra/env/.env.example`), `nginx -t` trên `nginx:1.27-alpine`, và `docker build` cả 3 image (`webapi`, `frontend`, `ai-service`).

## Kết quả kiểm tra

- **OpenAPI & `tools`:** `corepack pnpm --filter tools test` (**11/11 passed**), `openapi:check` (11 modules, 110 paths, 55 schemas up to date), `openapi:lint` (`0 error`).
- **Frontend:** `lint`, `typecheck`, `test` (**3 files, 12/12 passed**), `build` (`dist/` built cleanly).
- **Backend (`Release`):** `dotnet build backend/BrainMemo.sln -c Release` (**0 warnings, 0 errors**).
  - Test có MinIO (`docker compose -f infra/docker-compose.dev.yml up -d --wait minio` + `minio-init`): **140/140 passed** (`BuildingBlocks.UnitTests`: 69/69, `Architecture.Tests`: 13/13, `WebApi.Tests`: 58/58 gồm cả MinIO integration tests).
  - Test không MinIO (`--filter "FullyQualifiedName!~MinioIntegrationTests"`): **138/138 passed**.
- **AI Service:** `python -m compileall -q ai-service/app` exit 0.
- **Nginx & Docker (`nginx:1.27-alpine`, Compose v5.5.1, Docker 29.8.0):**
  - `docker compose -f infra/docker-compose.dev.yml config --quiet` & `docker compose --env-file infra/env/.env.example -f infra/docker-compose.yml config --quiet`: exit 0.
  - `nginx -t` cho cả [`infra/nginx/nginx.conf`](../../infra/nginx/nginx.conf) và [`frontend/nginx.conf`](../../frontend/nginx.conf): `syntax is ok` / `test is successful`.
  - `docker build` tạo thành công cả 3 image (`ai-service`, `backend`, `frontend`).
  - **Smoke test full-stack `infra/docker-compose.yml` (`--env-file infra/env/.env.example`):** Cả 7 service chạy nền (`mysql` + `db/schema.sql`, `minio`, `mailpit`, `ai-service`, `webapi`, `frontend`, `nginx`) đạt trạng thái `healthy` và `minio-init` exit `0` (tạo bucket private `brainmemo-media` + lifecycle `tmp/` 1 ngày). Qua Nginx trả về: `/nginx-health` `200 ok`, `/health` `200` JSON `BrainMemo.WebApi` `Healthy`, `/` `200` HTML, route SPA `/courses/demo` `200` fallback `index.html`, `/api/v1/nonexistent-endpoint` `404 application/problem+json`.
  - **Lưu ý Jenkins:** Chưa có Jenkins controller cục bộ để chạy trực tiếp file `Jenkinsfile`; từng lệnh trong các stage đã kiểm tra trực tiếp trên máy và qua container Linux.

## Việc INT / các role cần biết

- **`docker compose up --wait` với `minio-init`:** `minio-init` là container chạy một lần (`restart: "no"`) nên sau khi hoàn thành sẽ chuyển sang trạng thái `Exited (0)` — nếu dùng `--wait` sẽ bị tính là container đã thoát. Hãy chạy `docker compose ... up -d` (không `--wait`), hoặc `--wait` danh sách service chạy nền rồi chạy `up --exit-code-from minio-init minio-init` như trong `Jenkinsfile`.
- **`prettier --check` (`frontend`):** Khi kiểm tra cả trên Windows lẫn checkout LF thuần trong Linux container (`node:22-alpine`), `corepack pnpm --filter frontend format:check` hiện báo lỗi style ở 63 file có sẵn từ trước; `Jenkinsfile` giữ đúng gate `lint`, `typecheck`, `test`, `build` theo đặc tả task (có thể bật lại `format:check` sau khi FE chạy Prettier `--write`). Tương tự không bật `dotnet format --verify-no-changes` trong CI để tránh lỗi `ENDOFLINE` khi agent checkout trên Windows với `core.autocrlf=true`; compiler gate đã được `TreatWarningsAsErrors=true` siết ở `dotnet build`.
- **Biến môi trường & Docker Compose full-stack:** [`infra/env/.env.example`](../../infra/env/.env.example) giữ `localhost` phục vụ chạy `dotnet run` trên máy host; [`infra/docker-compose.yml`](../../infra/docker-compose.yml) tự ghi đè kết nối nội bộ (`mysql:3306`, `http://minio:9000`, `mailpit`, `http://ai-service:8000`) và cho phép override qua `DOCKER_CONNECTION_STRING`, `DOCKER_S3_ENDPOINT`, `DOCKER_SMTP_HOST`, `DOCKER_PHOBERT_BASE_URL` khi lên VPS (`T-S12-OPS-01`). Khi chạy lệnh validate hoặc dựng stack từ thư mục gốc repo, truyền `--env-file infra/env/.env.example` hoặc `--env-file .env`.
- **Docker MinIO trong CI:** [`infra/docker-compose.dev.yml`](../../infra/docker-compose.dev.yml) đang đặt `container_name: brainmemo-minio-dev`, nên `disableConcurrentBuilds()` trong `Jenkinsfile` giúp tránh đụng độ container/port `9000` giữa các job song song.

