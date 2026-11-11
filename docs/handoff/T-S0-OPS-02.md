# Handoff Note – T-S0-OPS-02

- **Task:** `T-S0-OPS-02` – `infra/docker-compose.dev.yml` & `infra/env/.env.example`
- **Vai trò:** OPS
- **Nhánh:** `feat/T-S0-OPS-02-docker-compose-dev`
- **Trạng thái:** REVIEW

## Đã thực hiện

1. **`infra/docker-compose.dev.yml`:**
   - `mysql` (`mysql:8.0`): cấu hình `utf8mb4` / `utf8mb4_0900_ai_ci`, múi giờ `UTC`, map `${MYSQL_PORT:-3307}:3306` (tránh xung đột MySQL cài sẵn trên cổng 3306 của máy host; đổi `MYSQL_PORT=3306` trong `.env` nếu trống), mount `../db:/docker-entrypoint-initdb.d:ro` để tự nạp `db/schema.sql` khi khởi tạo volume mới.
   - `minio` (`pgsty/silo:latest`) + `minio-init` (`pgsty/mc:latest`): thay thế `minio/minio:latest` / `minio/mc:latest` (do Docker Hub hiện báo `pull access denied` cho ảnh MinIO công khai cũ). Cổng API `9000`, Console `9001`, CORS `*`. Container init tự tạo bucket `brainmemo-media` ở chế độ `private` (`DEC-06`) và thêm lifecycle rule xóa `tmp/` sau 1 ngày / 24h (`DEC-05`, kiểm tra tồn tại trước khi thêm nên idempotent).
   - `mailpit` (`axllent/mailpit:latest`): SMTP `1025`, Web UI `8025`, healthcheck `/mailpit readyz`.
   - `ai-service`: build từ `../ai-service/Dockerfile`, cổng `8000`, cung cấp `GET /health` và `POST /score` stub.

2. **`infra/env/.env.example`:**
   - Khai báo đầy đủ biến mẫu (không chứa secret thật) cho Docker Compose, MySQL 8, MinIO/R2 (`S3__*`), SMTP Mailpit, JWT (`30'` / `14 ngày`), Google OAuth, AI (`PhoBert__BaseUrl`, `Llm__*`), CORS và Frontend (`VITE_*`).

3. **`ai-service/` stub:**
   - Tạo `ai-service/Dockerfile`, `ai-service/pyproject.toml`, `ai-service/app/{__init__.py,schemas.py,main.py}` triển khai FastAPI stub (`GET /health`, `POST /score` trả `score=0.0`, `flagged=false`, `label="SAFE"`, `model="PhoBERT-stub"`).

## Kết quả kiểm tra

- `docker compose -f infra/docker-compose.dev.yml config --quiet`: đạt (exit 0).
- Chạy `docker compose -f infra/docker-compose.dev.yml up -d` với bản sao tạm `docs/schema.sql` -> `db/schema.sql`:
  - `mysql`: healthcheck đạt, entrypoint tự chạy `/docker-entrypoint-initdb.d/schema.sql`, `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='brainmemo_lms'` trả `58` bảng.
  - `minio` + `minio-init`: bucket `brainmemo-media` tạo thành công với quyền `private` và lifecycle rule `tmp/` 1 ngày (`Enabled`); chạy lại `up -d` báo `Lifecycle rule for tmp/ already exists` và thoát `0`.
  - `mailpit`: `GET http://localhost:8025/readyz` → `200`.
  - `ai-service`: `GET http://localhost:8000/health` → `200`, `POST http://localhost:8000/score` → `200`.
- Đã dọn bản sao tạm `db/schema.sql` và chạy `docker compose -f infra/docker-compose.dev.yml down -v` để bàn giao `db/` sạch cho `T-S0-DB-01`.

## Điểm lệch hợp đồng / Ghi chú cho các task tiếp theo

- Không chỉnh sửa `openapi/` hay `contracts/`.
- Dùng `pgsty/silo:latest` + `pgsty/mc:latest` (tương thích hoàn toàn API/biến môi trường MinIO S3) do image `minio/minio:latest` và `minio/mc:latest` không còn pull được công khai từ Docker Hub.
- Cổng MySQL host mặc định trong `.env.example` và `docker-compose.dev.yml` đặt `3307` để tránh trùng MySQL local trên `3306`.
- **`T-S0-DB-01`:** Sau khi đưa `schema.sql` (kèm `DEC-01`, `DEC-12`) vào `db/schema.sql`, chạy `docker compose -f infra/docker-compose.dev.yml down -v && docker compose -f infra/docker-compose.dev.yml up -d` để MySQL khởi tạo lại 59 bảng từ `db/schema.sql`. Lưu ý MySQL entrypoint bỏ qua thư mục con `db/seed/`, nên script seed trong `db/seed/` cần hướng dẫn chạy riêng (hoặc gắn thêm runner ở `T-S0-DB-01`).
- **`T-S11-BE-04`:** Thay logic stub trong `ai-service/app/main.py` bằng PhoBERT ONNX pipeline (`app/pipeline.py`).
